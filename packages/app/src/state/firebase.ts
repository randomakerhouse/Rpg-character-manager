import { initFirebase, isFirebaseConfigured } from "@rpg/persistence";

const env = import.meta.env;

/**
 * Cloud sync is entirely optional: if no Firebase project is configured (no .env.local),
 * the app keeps working exactly as before, fully local. See .env.example for setup.
 */
export function initCloudSyncIfConfigured(): boolean {
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = env.VITE_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return false;
  }

  initFirebase({ apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId });
  return isFirebaseConfigured();
}
