import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  onAuthChanged,
  getAuthorizedUserDoc,
  signInWithGoogle,
  signInAsDemo,
  createMockUser,
  logout,
  AuthorizedUser,
} from '../lib/auth';

interface AuthContextType {
  user: User | null;
  role: 'gestor' | 'motorista' | null;
  userData: AuthorizedUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInDemo: (roleTarget?: 'gestor' | 'motorista') => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_GESTOR_DATA: AuthorizedUser = {
  id: 'josreb@gmail.com',
  email: 'josreb@gmail.com',
  name: 'José Rebelo (Gestor Demo)',
  role: 'gestor',
};

const DEMO_MOTORISTA_DATA: AuthorizedUser = {
  id: 'manuel.antunes@tvde.pt',
  email: 'manuel.antunes@tvde.pt',
  name: 'Manuel Antunes (Motorista Demo)',
  role: 'motorista',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('tvde_demo_mode') === 'true';
  });

  const getSavedDemoRole = (): 'gestor' | 'motorista' => {
    return (localStorage.getItem('tvde_demo_role') as 'gestor' | 'motorista') || 'gestor';
  };

  const [user, setUser] = useState<User | null>(() => {
    if (localStorage.getItem('tvde_demo_mode') === 'true') {
      const demoRole = getSavedDemoRole();
      return demoRole === 'motorista'
        ? createMockUser('manuel.antunes@tvde.pt', 'Manuel Antunes (Motorista Demo)')
        : createMockUser('josreb@gmail.com', 'José Rebelo (Gestor Demo)');
    }
    return null;
  });

  const [userData, setUserData] = useState<AuthorizedUser | null>(() => {
    if (localStorage.getItem('tvde_demo_mode') === 'true') {
      const demoRole = getSavedDemoRole();
      return demoRole === 'motorista' ? DEMO_MOTORISTA_DATA : DEMO_GESTOR_DATA;
    }
    return null;
  });

  const [role, setRole] = useState<'gestor' | 'motorista' | null>(() => {
    if (localStorage.getItem('tvde_demo_mode') === 'true') {
      return getSavedDemoRole();
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    return localStorage.getItem('tvde_demo_mode') !== 'true';
  });

  const fetchUserRoleAndDoc = useCallback(async (u: User | null) => {
    if (isDemoMode) {
      return;
    }

    if (!u) {
      setUser(null);
      setUserData(null);
      setRole(null);
      return;
    }

    if (u.isAnonymous) {
      setUser(u);
      setUserData(DEMO_GESTOR_DATA);
      setRole('gestor');
      return;
    }

    if (!u.email) {
      setUser(null);
      setUserData(null);
      setRole(null);
      return;
    }

    try {
      const authDoc = await getAuthorizedUserDoc(u.email);
      if (authDoc) {
        setUser(u);
        setUserData(authDoc);
        setRole(authDoc.role);
      } else {
        await logout();
        setUser(null);
        setUserData(null);
        setRole(null);
      }
    } catch (err) {
      console.error('Erro ao verificar utilizador no AuthContext:', err);
      setUser(u);
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }
    const unsub = onAuthChanged(async (u) => {
      if (isDemoMode) return;
      setLoading(true);
      await fetchUserRoleAndDoc(u);
      setLoading(false);
    });
    return unsub;
  }, [fetchUserRoleAndDoc, isDemoMode]);

  const refreshRole = async () => {
    if (user && !isDemoMode) {
      await fetchUserRoleAndDoc(user);
    }
  };

  const signIn = async () => {
    localStorage.removeItem('tvde_demo_mode');
    setIsDemoMode(false);
    await signInWithGoogle();
  };

  const signInDemoHandler = async (roleTarget: 'gestor' | 'motorista' = 'gestor') => {
    localStorage.setItem('tvde_demo_mode', 'true');
    localStorage.setItem('tvde_demo_role', roleTarget);
    setIsDemoMode(true);
    const res = await signInAsDemo(roleTarget);
    setUser(res.user);
    setUserData(res.userData);
    setRole(roleTarget);
    setLoading(false);
  };

  const signOut_ = async () => {
    localStorage.removeItem('tvde_demo_mode');
    setIsDemoMode(false);
    await logout();
    setUser(null);
    setUserData(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        userData,
        loading,
        signIn,
        signInDemo: signInDemoHandler,
        signOut: signOut_,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
