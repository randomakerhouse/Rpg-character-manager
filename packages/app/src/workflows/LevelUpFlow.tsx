import { useState } from "react";
import type { StatIncrease } from "@rpg/engine";
import { applyLevelUp } from "@rpg/engine";
import Sheet from "../components/Sheet.js";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";

/** Level-ups are a common source of permanent stat/HP changes (ability score increases, more HP). */
export default function LevelUpFlow({ onClose }: { onClose: () => void }) {
  const { character, ruleset } = useCharacterContext();
  const applyUpdate = useAppStore((s) => s.applyUpdate);

  const [increases, setIncreases] = useState<StatIncrease[]>([]);
  const [maxHpIncrease, setMaxHpIncrease] = useState(0);

  const editableStats = ruleset.statDefinitions.filter((d) => d.valueType !== "calculated" && d.id !== "hp");

  function addRow() {
    setIncreases((prev) => [...prev, { statId: editableStats[0]?.id ?? "", delta: 1 }]);
  }

  function updateRow(index: number, patch: Partial<StatIncrease>) {
    setIncreases((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    setIncreases((prev) => prev.filter((_, i) => i !== index));
  }

  async function confirm() {
    const { character: updated, transaction } = applyLevelUp({
      character,
      ruleset,
      statIncreases: increases.filter((i) => i.statId),
      maxHpIncrease,
    });
    await applyUpdate(updated, transaction);
    onClose();
  }

  return (
    <Sheet title="Level Up" onClose={onClose}>
      <p className="hint">
        {character.name} will advance from level {character.level} to {character.level + 1}.
      </p>

      {character.stats.hp && (
        <div className="field">
          <label>Increase Max HP by</label>
          <input type="number" min={0} value={maxHpIncrease} onChange={(e) => setMaxHpIncrease(Number(e.target.value))} />
        </div>
      )}

      <div className="field">
        <label>Permanent stat increases</label>
        <div className="stack">
          {increases.map((row, i) => (
            <div className="row" key={i}>
              <select value={row.statId} onChange={(e) => updateRow(i, { statId: e.target.value })}>
                {editableStats.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input type="number" style={{ maxWidth: 80 }} value={row.delta} onChange={(e) => updateRow(i, { delta: Number(e.target.value) })} />
              <button className="link-button" onClick={() => removeRow(i)}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <button className="button" style={{ marginTop: "var(--space-2)" }} onClick={addRow} disabled={editableStats.length === 0}>
          + Add Stat Increase
        </button>
      </div>

      <button className="button button-primary button-block" onClick={confirm}>
        Confirm Level Up
      </button>
    </Sheet>
  );
}
