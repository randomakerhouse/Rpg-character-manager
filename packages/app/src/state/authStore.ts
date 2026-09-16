import { create } from "zustand";
import type { User } from "@rpg/persistence";
import { isFirebaseConfigured, logOut, signIn, signInWithGoogle, signUp, subscribeToAuthState } from "@rpg/persistence";

interface AuthState {
  /** Whether a Firebase project is configured at all (see .env.example). */
  configured: boolean;
  /** Whether the initial "are we already logged in" check has completed. */
  ready: boolean;
  user: User | null;
  error: string | null;

  init(): void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  clearError(): void;
}

let subscribed = false;

export const useAuthStore = create<AuthState>((set) => ({
  // NOTE: this module can load (and this initializer run) before main.tsx calls
  // initCloudSyncIfConfigured(), since static imports are evaluated before a module's own
  // top-level code. Don't trust isFirebaseConfigured() here — init() re-checks it once React
  // has mounted, by which point Firebase has definitely been initialized (or not).
  configured: false,
  ready: false,
  user: null,
  error: null,

  init() {
    const configured = isFirebaseConfigured();
    if (!configured) {
      set({ configured: false, ready: true });
      return;
    }
    set({ configured: true });
    if (subscribed) return;
    subscribed = true;
    subscribeToAuthState((user) => set({ user, ready: true }));
  },

  async signIn(email, password) {
    set({ error: null });
    try {
      await signIn(email, password);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Sign in failed." });
      throw err;
    }
  },

  async signUp(email, password) {
    set({ error: null });
    try {
      await signUp(email, password);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Sign up failed." });
      throw err;
    }
  },

  async signInWithGoogle() {
    set({ error: null });
    try {
      await signInWithGoogle();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Google sign-in failed." });
      throw err;
    }
  },

  async signOut() {
    await logOut();
  },

  clearError() {
    set({ error: null });
  },
}));
