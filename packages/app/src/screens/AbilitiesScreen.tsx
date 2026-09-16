import { useState } from "react";
import type { Ability, Effect, Modifier } from "@rpg/engine";
import { buildTransaction, generateId, literal } from "@rpg/engine";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";
import Sheet from "../components/Sheet.js";
import AddModifierWizard from "../workflows/AddModifierWizard.js";

export default function AbilitiesScreen() {
  const { character } = useCharacterContext();
  const applyUpdate = useAppStore((s) => s.applyUpdate);
  const [adding, setAdding] = useState(false);

  async function removeAbility(id: string) {
    const before = character.abilities;
    const after = before.filter((a) => a.id !== id);
    const transaction = buildTransaction({
      characterId: character.id,
      type: "ability_removed",
      summary: `Removed ability`,
      patch: [{ path: "abilities", before, after }],
    });
    await applyUpdate({ ...character, abilities: after }, transaction);
  }

  return (
    <div className="stack">
      {character.abilities.length === 0 && <p className="empty-state card">No abilities yet.</p>}
      {character.abilities.map((a) => (
        <div className="card" key={a.id}>
          <div className="row">
            <h3 style={{ margin: 0 }}>{a.name}</h3>
            <button className="link-button" onClick={() => removeAbility(a.id)}>
              Remove
            </button>
          </div>
          {a.description && <p className="hint">{a.description}</p>}
          <div className="tag-list">
            {a.uses && (
              <span className="badge">
                {a.uses.remaining}/{a.uses.max} uses
              </span>
            )}
            {a.trigger && <span className="badge badge-prompt">Reacts: {a.trigger}</span>}
            {a.tags.map((t) => (
              <span className="badge" key={t}>
                {t}
              </span>
            ))}
          </div>
        </div>
      ))}

      <button className="button button-primary button-block" onClick={() => setAdding(true)}>
        + Add Ability
      </button>

      {adding && (
        <Sheet title="New Ability" onClose={() => setAdding(false)}>
          <AddAbilityForm
            onCancel={() => setAdding(false)}
            onSave={async (ability) => {
              const before = character.abilities;
              const after = [...before, ability];
              const transaction = buildTransaction({
                characterId: character.id,
                type: "ability_added",
                summary: `Added ability: ${ability.name}`,
                patch: [{ path: "abilities", before, after }],
              });
              await applyUpdate({ ...character, abilities: after }, transaction);
              setAdding(false);
            }}
          />
        </Sheet>
      )}
    </div>
  );
}

function AddAbilityForm({ onSave, onCancel }: { onSave: (a: Ability) => void; onCancel: () => void }) {
  const { ruleset, character } = useCharacterContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hasUses, setHasUses] = useState(false);
  const [maxUses, setMaxUses] = useState(1);
  const [recharge, setRecharge] = useState<"shortRest" | "longRest" | "turnStart" | "turnEnd" | "never">("longRest");
  const [resourceId, setResourceId] = useState("");
  const [cost, setCost] = useState(1);
  const [reactive, setReactive] = useState<Modifier | null>(null);
  const [showReactiveWizard, setShowReactiveWizard] = useState(false);
  const [permanentStat, setPermanentStat] = useState(false);
  const [permanentStatId, setPermanentStatId] = useState(ruleset.statDefinitions.find((s) => s.valueType !== "calculated")?.id ?? "");
  const [permanentDelta, setPermanentDelta] = useState(1);

  function save() {
    const effects: Effect[] = [...(reactive?.effects ?? [])];
    if (permanentStat && permanentStatId) {
      effects.push({ op: "modifyStat", statId: permanentStatId, delta: literal(permanentDelta) });
    }

    const ability: Ability = {
      id: generateId(),
      name: name.trim() || "New Ability",
      description: description.trim() || undefined,
      uses: hasUses ? { max: maxUses, remaining: maxUses, recharge } : undefined,
      resourceConsumedId: resourceId || undefined,
      cost: resourceId ? cost : undefined,
      tags: [],
      activationMode: reactive?.activationMode ?? "MANUAL",
      trigger: reactive?.trigger,
      conditions: reactive?.conditions ?? null,
      effects: effects.length > 0 ? effects : undefined,
    };
    onSave(ability);
  }

  if (showReactiveWizard) {
    return (
      <AddModifierWizard
        ruleset={ruleset}
        sourceRef={{ kind: "ability", abilityId: "pending" }}
        onCancel={() => setShowReactiveWizard(false)}
        onCreate={(modifier) => {
          setReactive(modifier);
          setShowReactiveWizard(false);
        }}
      />
    );
  }

  return (
    <div className="stack">
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <label className="toggle-row">
        <input type="checkbox" checked={hasUses} onChange={(e) => setHasUses(e.target.checked)} />
        This ability has limited uses
      </label>
      {hasUses && (
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>Max uses</label>
            <input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Recharges on</label>
            <select value={recharge} onChange={(e) => setRecharge(e.target.value as typeof recharge)}>
              <option value="shortRest">Short rest</option>
              <option value="longRest">Long rest</option>
              <option value="turnStart">Start of turn</option>
              <option value="turnEnd">End of turn</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>
      )}

      {Object.keys(character.resources).length > 0 && (
        <div className="field">
          <label>Consumes a resource (optional)</label>
          <select value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
            <option value="">None</option>
            {Object.values(character.resources).map((r) => (
              <option key={r.resourceDefId} value={r.resourceDefId}>
                {ruleset.resourceDefinitions.find((d) => d.id === r.resourceDefId)?.name ?? r.resourceDefId}
              </option>
            ))}
          </select>
          {resourceId && (
            <input type="number" min={1} value={cost} onChange={(e) => setCost(Number(e.target.value))} style={{ marginTop: 8 }} />
          )}
        </div>
      )}

      <div className="field">
        <label>Automatic behavior (optional)</label>
        {reactive ? (
          <div className="row">
            <span className="hint">{reactive.humanReadableSummary}</span>
            <button className="link-button" onClick={() => setReactive(null)}>
              Remove
            </button>
          </div>
        ) : (
          <button className="button" onClick={() => setShowReactiveWizard(true)}>
            + Define when this triggers
          </button>
        )}
      </div>

      <label className="toggle-row">
        <input type="checkbox" checked={permanentStat} onChange={(e) => setPermanentStat(e.target.checked)} />
        Using this ability permanently changes a statistic (e.g. a potion of ability score increase)
      </label>
      {permanentStat && (
        <div className="row">
          <select value={permanentStatId} onChange={(e) => setPermanentStatId(e.target.value)}>
            {ruleset.statDefinitions
              .filter((s) => s.valueType !== "calculated")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
          <input type="number" style={{ maxWidth: 90 }} value={permanentDelta} onChange={(e) => setPermanentDelta(Number(e.target.value))} />
        </div>
      )}

      <div className="row">
        <button className="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="button button-primary" onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}
