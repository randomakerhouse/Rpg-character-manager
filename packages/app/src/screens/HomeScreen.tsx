import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { importCharacter, ImportError } from "@rpg/persistence";
import { useAppStore } from "../state/appStore.js";
import { useAuthStore } from "../state/authStore.js";
import CharacterAvatar from "../components/CharacterAvatar.js";

const SYNC_ICON: Record<string, string> = {
  disabled: "",
  idle: "☁️",
  syncing: "\u{1F504}",
  synced: "✅",
  error: "⚠️",
};

export default function HomeScreen() {
  const navigate = useNavigate();
  const characters = useAppStore(useShallow((s) => s.characterOrder.map((id) => s.charactersById[id]!)));
  const saveCharacter = useAppStore((s) => s.saveCharacter);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const user = useAuthStore((s) => s.user);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const character = importCharacter(JSON.parse(text));
      await saveCharacter(character);
      navigate(`/characters/${character.id}`);
    } catch (err) {
      alert(err instanceof ImportError ? err.message : "Couldn't read that file.");
    }
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        <div className="top-bar" style={{ position: "static", marginBottom: "var(--space-4)" }}>
          <h1>Your Characters</h1>
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <button className="button" onClick={() => navigate("/account")} title="Account & cloud sync">
              {user ? `${SYNC_ICON[syncStatus] ?? ""} ${user.email}` : "Account"}
            </button>
            <button className="button" onClick={() => fileInput.current?.click()}>
              Import
            </button>
            <input ref={fileInput} type="file" accept="application/json" hidden onChange={handleImport} />
            <button className="button button-primary" onClick={() => navigate("/new")}>
              + New Character
            </button>
          </div>
        </div>

        {characters.length === 0 ? (
          <div className="empty-state card">
            <p>No characters yet. Create your first one to get started.</p>
            <button className="button button-primary" onClick={() => navigate("/new")}>
              + New Character
            </button>
          </div>
        ) : (
          <div className="grid">
            {characters.map((c) => (
              <button
                key={c.id}
                className="card row"
                style={{ textAlign: "left", cursor: "pointer" }}
                onClick={() => navigate(`/characters/${c.id}`)}
              >
                <CharacterAvatar imageUrl={c.imageUrl} name={c.name} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0 }}>{c.name}</h3>
                  <p className="hint" style={{ margin: "4px 0 0" }}>
                    Level {c.level}
                    {c.stats.hp ? ` · HP ${c.stats.hp.current}/${c.stats.hp.max}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
