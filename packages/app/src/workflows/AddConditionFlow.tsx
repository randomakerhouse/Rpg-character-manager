import { useState } from "react";
import { applySideEffects, buildTransaction } from "@rpg/engine";
import Sheet from "../components/Sheet.js";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";

export default function AddConditionFlow({ onClose }: { onClose: () => void }) {
  const { character, ruleset } = useCharacterContext();
  const applyUpdate = useAppStore((s) => s.applyUpdate);

  const [conditionId, setConditionId] = useState(ruleset.conditionDefinitions[0]?.id ?? "");
  const [amount, setAmount] = useState(3);
  const [unit, setUnit] = useState<"rounds" | "turns">("turns");

  const def = ruleset.conditionDefinitions.find((c) => c.id === conditionId);

  async function confirm() {
    if (!def) return;
    const applied = applySideEffects(
      character,
      ruleset,
      [{ entryId: "manual", entryName: "Manual", effect: { op: "applyCondition", conditionId: def.id, duration: { kind: unit, amount } } }],
      {},
    );
    const transaction = buildTransaction({
      characterId: character.id,
      type: "condition_added",
      summary: `Added condition: ${def.name} (${amount} ${unit})`,
      patch: applied.patch,
    });
    await applyUpdate(applied.character, transaction);
    onClose();
  }

  if (ruleset.conditionDefinitions.length === 0) {
    return (
      <Sheet title="Add Condition" onClose={onClose}>
        <p className="hint">This ruleset doesn't define any conditions yet.</p>
      </Sheet>
    );
  }

  return (
    <Sheet title="Add Condition" onClose={onClose}>
      <div className="field">
        <label>Condition</label>
        <select value={conditionId} onChange={(e) => setConditionId(e.target.value)}>
          {ruleset.conditionDefinitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {def?.description && <span className="hint">{def.description}</span>}
      </div>
      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label>Duration</label>
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value as "rounds" | "turns")}>
            <option value="turns">Turns</option>
            <option value="rounds">Rounds</option>
          </select>
        </div>
      </div>
      <button className="button button-primary button-block" onClick={confirm}>
        Add Condition
      </button>
    </Sheet>
  );
}
