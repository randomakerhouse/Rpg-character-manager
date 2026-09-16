import { useState } from "react";
import type { Modifier } from "@rpg/engine";
import { buildTransaction } from "@rpg/engine";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";
import Sheet from "../components/Sheet.js";
import AddModifierWizard from "../workflows/AddModifierWizard.js";

interface EffectRow {
  id: string;
  name: string;
  source: string;
  summary: string;
  remaining?: string;
}

export default function EffectsScreen() {
  const { character, ruleset } = useCharacterContext();
  const applyUpdate = useAppStore((s) => s.applyUpdate);
  const [addingIntrinsic, setAddingIntrinsic] = useState(false);

  const rows: EffectRow[] = [];

  for (const m of character.intrinsicModifiers) {
    if (!m.enabled) continue;
    rows.push({ id: m.id, name: m.name, source: "Intrinsic", summary: m.humanReadableSummary });
  }
  for (const w of character.weapons) {
    if (!w.equipped) continue;
    for (const m of w.modifiers) {
      if (!m.enabled) continue;
      rows.push({ id: m.id, name: m.name, source: w.name, summary: m.humanReadableSummary });
    }
  }
  for (const it of character.items) {
    if (!it.equipped) continue;
    for (const m of it.modifiers) {
      if (!m.enabled) continue;
      rows.push({ id: m.id, name: m.name, source: it.name, summary: m.humanReadableSummary });
    }
  }
  for (const ac of character.activeConditions) {
    const def = ruleset.conditionDefinitions.find((d) => d.id === ac.conditionDefId);
    const conditionName = def?.name ?? ac.modifiers[0]?.name ?? ac.conditionDefId;
    const remaining = ac.remaining ? `${ac.remaining.amount} ${ac.remaining.kind} remaining` : undefined;
    if (ac.modifiers.length === 0) {
      rows.push({ id: ac.id, name: conditionName, source: "Condition", summary: def?.description ?? "", remaining });
    }
    for (const m of ac.modifiers) {
      rows.push({ id: `${ac.id}-${m.id}`, name: conditionName, source: "Condition", summary: m.humanReadableSummary, remaining });
    }
  }

  async function removeCondition(activeConditionId: string) {
    const before = character.activeConditions;
    const after = before.filter((c) => c.id !== activeConditionId);
    const transaction = buildTransaction({
      characterId: character.id,
      type: "condition_removed",
      summary: "Removed condition",
      patch: [{ path: "activeConditions", before, after }],
    });
    await applyUpdate({ ...character, activeConditions: after }, transaction);
  }

  async function addIntrinsicModifier(modifier: Modifier) {
    const before = character.intrinsicModifiers;
    const after = [...before, modifier];
    const transaction = buildTransaction({
      characterId: character.id,
      type: "modifier_added",
      summary: `Added modifier: ${modifier.name}`,
      patch: [{ path: "intrinsicModifiers", before, after }],
    });
    await applyUpdate({ ...character, intrinsicModifiers: after }, transaction);
    setAddingIntrinsic(false);
  }

  async function removeIntrinsicModifier(id: string) {
    const before = character.intrinsicModifiers;
    const after = before.filter((m) => m.id !== id);
    const transaction = buildTransaction({
      characterId: character.id,
      type: "modifier_removed",
      summary: "Removed modifier",
      patch: [{ path: "intrinsicModifiers", before, after }],
    });
    await applyUpdate({ ...character, intrinsicModifiers: after }, transaction);
  }

  return (
    <div className="stack">
      <h3>Active Effects</h3>
      {rows.length === 0 && <p className="empty-state card">Nothing is currently affecting this character.</p>}
      {rows.map((r) => (
        <div className="card" key={r.id}>
          <div className="row">
            <strong>{r.name}</strong>
            <span className="hint">{r.source}</span>
          </div>
          <p className="hint">{r.summary}</p>
          {r.remaining && <span className="badge badge-prompt">{r.remaining}</span>}
        </div>
      ))}

      {character.activeConditions.length > 0 && (
        <>
          <h3>Conditions</h3>
          {character.activeConditions.map((ac) => {
            const def = ruleset.conditionDefinitions.find((d) => d.id === ac.conditionDefId);
            return (
              <div className="row card" key={ac.id}>
                <span>{def?.name ?? ac.modifiers[0]?.name ?? ac.conditionDefId}</span>
                <button className="link-button" onClick={() => removeCondition(ac.id)}>
                  Remove
                </button>
              </div>
            );
          })}
        </>
      )}

      <h3>Character Modifiers</h3>
      <p className="hint">Traits baked into the character itself, always active (e.g. racial resistances).</p>
      {character.intrinsicModifiers.map((m) => (
        <div className="row card" key={m.id}>
          <span>{m.name}</span>
          <button className="link-button" onClick={() => removeIntrinsicModifier(m.id)}>
            Remove
          </button>
        </div>
      ))}
      <button className="button button-block" onClick={() => setAddingIntrinsic(true)}>
        + Add Modifier
      </button>

      {addingIntrinsic && (
        <Sheet title="Add Character Modifier" onClose={() => setAddingIntrinsic(false)}>
          <AddModifierWizard
            ruleset={ruleset}
            sourceRef={{ kind: "intrinsic" }}
            onCancel={() => setAddingIntrinsic(false)}
            onCreate={addIntrinsicModifier}
          />
        </Sheet>
      )}
    </div>
  );
}
