import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

export const AUTHORIZED_USERS: Record<string, { role: 'gestor' | 'motorista'; name: string }> = {
  'josreb@gmail.com':    { role: 'gestor', name: 'José Rebelo' },
  'alexreb60@gmail.com': { role: 'gestor', name: 'Alexandre'   },
};

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const email = result.user.email ?? '';
  if (!AUTHORIZED_USERS[email]) {
    await signOut(auth);
    throw new Error(`Acesso não autorizado: ${email}`);
  }
  return result.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function onAuthChanged(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export function getUserRole(email: string) {
  return AUTHORIZED_USERS[email] ?? null;
}
