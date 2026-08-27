import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  onAuthChanged,
  getAuthorizedUserDoc,
  signInWithGoogle,
  logout,
  AuthorizedUser,
} from '../lib/auth';

interface AuthContextType {
  user: User | null;
  role: 'gestor' | 'motorista' | null;
  userData: AuthorizedUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AuthorizedUser | null>(null);
  const [role, setRole] = useState<'gestor' | 'motorista' | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRoleAndDoc = useCallback(async (u: User | null) => {
    if (!u || !u.email) {
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
        // Email not registered in AuthorizedUsers — force logout
        await logout();
        setUser(null);
        setUserData(null);
        setRole(null);
      }
    } catch (err) {
      console.error('Error checking user in AuthContext:', err);
      setUser(u);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthChanged(async (u) => {
      setLoading(true);
      await fetchUserRoleAndDoc(u);
      setLoading(false);
    });
    return unsub;
  }, [fetchUserRoleAndDoc]);

  const refreshRole = async () => {
    if (user) {
      await fetchUserRoleAndDoc(user);
    }
  };

  const signIn = async () => {
    await signInWithGoogle();
  };

  const signOut_ = async () => {
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
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
