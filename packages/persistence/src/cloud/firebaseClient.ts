import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

/** Initializes the Firebase app once. Safe to call multiple times (e.g. React StrictMode). */
export function initFirebase(config: FirebaseConfig): void {
  const existingApps = getApps();
  app = existingApps.length > 0 ? existingApps[0]! : initializeApp(config);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
}

export function isFirebaseConfigured(): boolean {
  return app !== undefined;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) throw new Error("Firebase is not initialized — call initFirebase() first.");
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) throw new Error("Firebase is not initialized — call initFirebase() first.");
  return dbInstance;
}
