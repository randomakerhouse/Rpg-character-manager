import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import type { Transaction } from "@rpg/engine";
import { useAppStore } from "../state/appStore.js";
import { CharacterContext } from "../state/CharacterContext.js";
import CharacterAvatar from "../components/CharacterAvatar.js";

const EMPTY_TRANSACTIONS: Transaction[] = [];

const TABS = [
  { to: "overview", label: "Overview", icon: "\u{1F4CB}" },
  { to: "stats", label: "Stats", icon: "\u{1F522}" },
  { to: "combat", label: "Combat", icon: "⚔️" },
  { to: "abilities", label: "Abilities", icon: "\u{1F31F}" },
  { to: "inventory", label: "Inventory", icon: "\u{1F392}" },
  { to: "effects", label: "Effects", icon: "✨" },
  { to: "ruleset", label: "System", icon: "\u{1F6E0}️" },
  { to: "history", label: "History", icon: "\u{1F4DC}" },
  { to: "settings", label: "Settings", icon: "⚙️" },
];

export default function CharacterShell() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const character = useAppStore((s) => (id ? s.charactersById[id] : undefined));
  const ruleset = useAppStore((s) => (character ? s.rulesetsById[character.rulesetId] : undefined));
  const transactions = useAppStore((s) => (id ? (s.transactionsByCharacter[id] ?? EMPTY_TRANSACTIONS) : EMPTY_TRANSACTIONS));

  if (!character || !ruleset) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <div className="empty-state">
            <p>Character not found.</p>
            <button className="button button-primary" onClick={() => navigate("/")}>
              Back to characters
            </button>
          </div>
        </main>
      </div>
    );
  }

  const hp = character.stats.hp;

  return (
    <CharacterContext.Provider value={{ character, ruleset, transactions }}>
      <div className="app-shell">
        <nav className="nav-bar">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={({ isActive }) => (isActive ? "active" : "")}>
              <span aria-hidden>{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <header className="top-bar">
            <button className="button button-ghost" onClick={() => navigate("/")} aria-label="Back to character list">
              {"←"}
            </button>
            <div className="row" style={{ gap: "var(--space-2)" }}>
              <CharacterAvatar imageUrl={character.imageUrl} name={character.name} size={32} />
              <h1>{character.name}</h1>
            </div>
            <span className="hint">
              {hp ? `HP ${hp.current}/${hp.max}` : `Lvl ${character.level}`}
            </span>
          </header>
          <main className="app-main">
            <Outlet />
          </main>
        </div>
      </div>
    </CharacterContext.Provider>
  );
}
