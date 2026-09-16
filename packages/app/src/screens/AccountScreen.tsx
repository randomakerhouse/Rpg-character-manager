import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../state/authStore.js";
import { useAppStore } from "../state/appStore.js";

const STATUS_LABEL: Record<string, string> = {
  disabled: "Cloud sync not set up",
  idle: "Not syncing yet",
  syncing: "Syncing…",
  synced: "Synced",
  error: "Sync error",
};

export default function AccountScreen() {
  const navigate = useNavigate();
  const { configured, ready, user, error, signIn, signUp, signInWithGoogle, signOut, clearError } = useAuthStore();
  const syncStatus = useAppStore((s) => s.syncStatus);
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt);
  const syncError = useAppStore((s) => s.syncError);
  const syncNow = useAppStore((s) => s.syncNow);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    clearError();
    setBusy(true);
    try {
      if (mode === "signin") await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
    } catch {
      // error already captured in the store
    } finally {
      setBusy(false);
    }
  }

  async function submitGoogle() {
    clearError();
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      // error already captured in the store
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="app-main" style={{ maxWidth: 480 }}>
        <div className="top-bar" style={{ position: "static", marginBottom: "var(--space-4)" }}>
          <button className="button button-ghost" onClick={() => navigate("/")}>
            {"←"} Back
          </button>
          <h1>Account & Sync</h1>
          <span />
        </div>

        {!ready && <p className="hint">Checking your sign-in status…</p>}

        {ready && !configured && (
          <div className="card">
            <p>
              Cloud sync isn't set up for this app yet. Your characters are still saved safely on this device — nothing changes
              until sync is configured.
            </p>
          </div>
        )}

        {ready && configured && !user && (
          <div className="card">
            <button className="button button-block" disabled={busy} onClick={submitGoogle}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
              </svg>
              Continue with Google
            </button>

            <div className="row" style={{ margin: "var(--space-4) 0 var(--space-3)", alignItems: "center" }}>
              <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
              <span className="hint">or with email</span>
              <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
            </div>

            <div className="row" style={{ marginBottom: "var(--space-3)" }}>
              <button className={`button ${mode === "signin" ? "button-primary" : ""}`} onClick={() => setMode("signin")}>
                Sign In
              </button>
              <button className={`button ${mode === "signup" ? "button-primary" : ""}`} onClick={() => setMode("signup")}>
                Create Account
              </button>
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
            </div>
            {error && <p className="hint" style={{ color: "var(--color-danger)" }}>{error}</p>}
            <button className="button button-primary button-block" disabled={busy || !email || password.length < 6} onClick={submit}>
              {mode === "signin" ? "Sign In" : "Create Account"}
            </button>
            <p className="hint" style={{ marginTop: "var(--space-3)" }}>
              Signing in lets you access the same characters from any device — nothing on this device is affected until you do.
            </p>
          </div>
        )}

        {configured && user && (
          <div className="card">
            <p>
              Signed in as <strong>{user.email}</strong>
            </p>
            <p className="hint">
              {STATUS_LABEL[syncStatus] ?? syncStatus}
              {lastSyncedAt ? ` · last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : ""}
            </p>
            {syncStatus === "error" && syncError && <p className="hint" style={{ color: "var(--color-danger)" }}>{syncError}</p>}
            <div className="row" style={{ marginTop: "var(--space-3)" }}>
              <button className="button" onClick={() => syncNow()} disabled={syncStatus === "syncing"}>
                Sync Now
              </button>
              <button className="button button-danger" onClick={() => signOut()}>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
