import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBYbYOH6nqr59nhHsJI7oCD6GyTOlHQ-MQ",
  authDomain: "gen-lang-client-0465939536.firebaseapp.com",
  projectId: "gen-lang-client-0465939536",
  storageBucket: "gen-lang-client-0465939536.firebasestorage.app",
  messagingSenderId: "457547611668",
  appId: "1:457547611668:web:fa44ef4e998c032d91b101"
};

const firestoreDatabaseId = "ai-studio-tvdefleetmasterg-300d7ace-afbe-48b4-b1fb-ca191a9d7c9f";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
