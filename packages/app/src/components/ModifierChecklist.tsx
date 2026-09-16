import type { MatchedModifiers, TriggerableEntry } from "@rpg/engine";

interface ModifierChecklistProps {
  matched: MatchedModifiers;
  acceptedIds: Set<string>;
  onToggle: (entry: TriggerableEntry) => void;
}

/**
 * Surfaces every relevant modifier: AUTO ones show as already-applied, PROMPT/MANUAL ones
 * are toggleable checkboxes the player decides on (sections 5, 26, 42, 43).
 */
export default function ModifierChecklist({ matched, acceptedIds, onToggle }: ModifierChecklistProps) {
  if (matched.auto.length === 0 && matched.prompt.length === 0 && matched.manual.length === 0) {
    return <p className="hint">No relevant modifiers found.</p>;
  }

  return (
    <div className="stack">
      {matched.auto.map((entry) => (
        <div className="row" key={entry.id}>
          <span>
            <span className="badge badge-auto">AUTO</span> {entry.name}
          </span>
          <span className="hint">applied</span>
        </div>
      ))}
      {matched.prompt.map((entry) => (
        <label className="toggle-row" key={entry.id}>
          <input type="checkbox" checked={acceptedIds.has(entry.id)} onChange={() => onToggle(entry)} />
          <span className="badge badge-prompt">SUGGESTED</span>
          <span>{entry.name}</span>
          {entry.description && <span className="hint">— {entry.description}</span>}
        </label>
      ))}
      {matched.manual.map((entry) => (
        <label className="toggle-row" key={entry.id}>
          <input type="checkbox" checked={acceptedIds.has(entry.id)} onChange={() => onToggle(entry)} />
          <span className="badge badge-manual">MANUAL</span>
          <span>{entry.name}</span>
        </label>
      ))}
    </div>
  );
}
