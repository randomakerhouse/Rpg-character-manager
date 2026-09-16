import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebaseClient.js";

export type { User };

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

function friendlyMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "There's already an account with that email — try signing in instead.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts — please wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup — allow popups for this site and try again.";
    case "auth/account-exists-with-different-credential":
      return "There's already an account with that email using a different sign-in method.";
    case "auth/unauthorized-domain":
      return "This site isn't authorized for Google sign-in yet — add its domain in Firebase Console under Authentication > Settings > Authorized domains.";
    default:
      return "Something went wrong signing you in. Please try again.";
  }
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function signUp(email: string, password: string): Promise<User> {
  try {
    const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    return credential.user;
  } catch (error) {
    throw new AuthError(friendlyMessage((error as { code?: string }).code ?? ""));
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    return credential.user;
  } catch (error) {
    throw new AuthError(friendlyMessage((error as { code?: string }).code ?? ""));
  }
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const credential = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    return credential.user;
  } catch (error) {
    throw new AuthError(friendlyMessage((error as { code?: string }).code ?? ""));
  }
}

export async function logOut(): Promise<void> {
  await signOut(getFirebaseAuth());
}
