import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthChanged, getUserRole, signInWithGoogle, logout } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  role: 'gestor' | 'motorista' | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [role, setRole]     = useState<'gestor' | 'motorista' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChanged((u) => {
      setUser(u);
      setRole(u?.email ? getUserRole(u.email)?.role ?? null : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async () => {
    await signInWithGoogle();
  };

  const signOut_ = async () => {
    await logout();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut: signOut_ }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
