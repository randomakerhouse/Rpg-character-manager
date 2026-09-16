import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";
import TraceView from "../components/TraceView.js";

export default function HistoryScreen() {
  const { character, transactions } = useCharacterContext();
  const undo = useAppStore((s) => s.undo);

  const ordered = [...transactions].reverse();
  const mostRecentActiveId = transactions.slice().reverse().find((t) => !t.undone)?.id;

  return (
    <div className="stack">
      {ordered.length === 0 && <p className="empty-state card">Nothing has happened yet.</p>}
      {ordered.map((t) => (
        <div className="card" key={t.id} style={{ opacity: t.undone ? 0.5 : 1 }}>
          <div className="row">
            <strong>{t.summary}</strong>
            <span className="hint">{new Date(t.timestamp).toLocaleTimeString()}</span>
          </div>
          {t.manualOverride && (
            <p className="hint">
              Calculated {t.manualOverride.calculatedValue}, overridden to {t.manualOverride.overriddenValue} ({t.manualOverride.reason})
            </p>
          )}
          {t.trace && t.trace.steps.length > 1 && <TraceView trace={t.trace} />}
          {t.undone && <span className="badge">Undone</span>}
          {t.id === mostRecentActiveId && (
            <button className="button" style={{ marginTop: "var(--space-2)" }} onClick={() => undo(character.id)}>
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
