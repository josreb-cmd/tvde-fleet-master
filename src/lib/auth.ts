import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export interface AuthorizedUser {
  id?: string;
  email: string;
  name: string;
  role: 'gestor' | 'motorista';
  createdAt?: any;
}

export const INITIAL_USERS: AuthorizedUser[] = [
  { email: 'josreb@gmail.com', name: 'José Rebelo', role: 'gestor' },
  { email: 'alexreb60@gmail.com', name: 'Alexandre Rebelo', role: 'gestor' },
];

/**
 * Normaliza o email para minúsculas
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Procura um documento de utilizador em authorizedUsers por email.
 * Se for um dos utilizadores iniciais e não existir na BD, faz o seed automático.
 */
export async function getAuthorizedUserDoc(email: string): Promise<AuthorizedUser | null> {
  if (!email) return null;
  const cleanEmail = normalizeEmail(email);
  const docRef = doc(db, 'authorizedUsers', cleanEmail);

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        email: data.email || cleanEmail,
        name: data.name || cleanEmail.split('@')[0],
        role: data.role === 'motorista' ? 'motorista' : 'gestor',
        createdAt: data.createdAt,
      };
    }

    // Se for um utilizador inicial, cria automaticamente no Firestore
    const initialMatch = INITIAL_USERS.find(u => normalizeEmail(u.email) === cleanEmail);
    if (initialMatch) {
      await setDoc(docRef, {
        email: cleanEmail,
        name: initialMatch.name,
        role: initialMatch.role,
        createdAt: serverTimestamp(),
      });
      return {
        id: cleanEmail,
        email: cleanEmail,
        name: initialMatch.name,
        role: initialMatch.role,
      };
    }

    return null;
  } catch (err) {
    console.error('Erro ao verificar authorizedUsers:', err);
    // Fallback para utilizadores iniciais se a BD ainda não tiver inicializado totalmente
    const initialMatch = INITIAL_USERS.find(u => normalizeEmail(u.email) === cleanEmail);
    if (initialMatch) {
      return {
        id: cleanEmail,
        email: cleanEmail,
        name: initialMatch.name,
        role: initialMatch.role,
      };
    }
    return null;
  }
}

/**
 * Inicia sessão com Google Popup e valida se o utilizador está na coleção authorizedUsers.
 */
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email ?? '';

    const userDoc = await getAuthorizedUserDoc(email);
    if (!userDoc) {
      await signOut(auth);
      throw new Error(`Acesso não autorizado: ${email}. O seu email não está registado no sistema.`);
    }

    return result.user;
  } catch (err: any) {
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('A janela do Google foi fechada ou bloqueada pelo iframe do navegador. Por favor clique em "Abrir num Novo Separador" para fazer login com a sua conta Google, ou use o "Modo Demonstração".');
    }
    if (err.code === 'auth/popup-blocked') {
      throw new Error('O navegador bloqueou a janela pop-up do Google. Por favor abra a aplicação num novo separador ou permita pop-ups.');
    }
    if (err.code === 'auth/cancelled-popup-request') {
      throw new Error('O pedido de login foi cancelado.');
    }
    throw err;
  }
}

export function createMockUser(email = 'josreb@gmail.com', displayName = 'José Rebelo (Gestor)'): User {
  return {
    uid: 'demo-' + email.replace(/[^a-zA-Z0-9]/g, '-'),
    email,
    displayName,
    photoURL: null,
    emailVerified: true,
    isAnonymous: true,
    metadata: {},
    providerData: [],
    refreshToken: 'demo-token',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'demo-token',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    providerId: 'demo',
  } as unknown as User;
}

/**
 * Inicia sessão em Modo Demonstração / Preview
 */
export async function signInAsDemo(role: 'gestor' | 'motorista' = 'gestor'): Promise<{ user: User; userData: AuthorizedUser }> {
  let user: User | null = null;
  try {
    const cred = await signInAnonymously(auth);
    user = cred.user;
  } catch (err) {
    console.warn("signInAnonymously não disponível, a usar utilizador mock de demonstração:", err);
  }

  const isGestor = role === 'gestor';
  const email = isGestor ? 'josreb@gmail.com' : 'manuel.antunes@tvde.pt';
  const name = isGestor ? 'José Rebelo (Gestor Demo)' : 'Manuel Antunes (Motorista Demo)';

  if (!user) {
    user = createMockUser(email, name);
  }

  const demoUserData: AuthorizedUser = {
    id: email,
    email: email,
    name: name,
    role: role,
  };
  return { user, userData: demoUserData };
}

/**
 * Lê todos os utilizadores autorizados da coleção authorizedUsers no Firestore.
 */
export async function getAuthorizedUsers(): Promise<AuthorizedUser[]> {
  try {
    const colRef = collection(db, 'authorizedUsers');
    const snap = await getDocs(colRef);

    if (snap.empty) {
      // Seed inicial se a coleção estiver vazia
      for (const u of INITIAL_USERS) {
        const cleanEmail = normalizeEmail(u.email);
        await setDoc(doc(db, 'authorizedUsers', cleanEmail), {
          email: cleanEmail,
          name: u.name,
          role: u.role,
          createdAt: serverTimestamp(),
        });
      }
      return INITIAL_USERS;
    }

    const users: AuthorizedUser[] = [];
    snap.forEach((d) => {
      const data = d.data();
      users.push({
        id: d.id,
        email: data.email || d.id,
        name: data.name || (data.email ? data.email.split('@')[0] : d.id),
        role: data.role === 'motorista' ? 'motorista' : 'gestor',
        createdAt: data.createdAt,
      });
    });

    return users.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error('Erro ao obter utilizadores autorizados:', err);
    return INITIAL_USERS;
  }
}

/**
 * Adiciona ou atualiza um utilizador autorizado na coleção authorizedUsers.
 */
export async function addAuthorizedUser(
  email: string,
  name: string,
  role: 'gestor' | 'motorista'
): Promise<void> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) throw new Error('Email é obrigatório.');

  const docRef = doc(db, 'authorizedUsers', cleanEmail);
  await setDoc(
    docRef,
    {
      email: cleanEmail,
      name: name.trim() || cleanEmail.split('@')[0],
      role,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Remove um utilizador autorizado da coleção authorizedUsers.
 */
export async function removeAuthorizedUser(emailOrId: string): Promise<void> {
  const cleanEmail = normalizeEmail(emailOrId);
  if (!cleanEmail) return;

  const docRef = doc(db, 'authorizedUsers', cleanEmail);
  await deleteDoc(docRef);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function onAuthChanged(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}
