import { useState } from "react";
import type { CharacterStat, StatDefinition, StatValueType } from "@rpg/engine";
import { buildTransaction, generateId } from "@rpg/engine";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";

const CLASSIC_ABILITY_SCORES: Omit<StatDefinition, "id">[] = [
  { name: "Strength", valueType: "simple", min: 1, max: 30, defaultValue: 10, derivesModifier: true },
  { name: "Dexterity", valueType: "simple", min: 1, max: 30, defaultValue: 10, derivesModifier: true },
  { name: "Constitution", valueType: "simple", min: 1, max: 30, defaultValue: 10, derivesModifier: true },
  { name: "Intelligence", valueType: "simple", min: 1, max: 30, defaultValue: 10, derivesModifier: true },
  { name: "Wisdom", valueType: "simple", min: 1, max: 30, defaultValue: 10, derivesModifier: true },
  { name: "Charisma", valueType: "simple", min: 1, max: 30, defaultValue: 10, derivesModifier: true },
];

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function RulesetScreen() {
  const { character, ruleset } = useCharacterContext();
  const saveRuleset = useAppStore((s) => s.saveRuleset);
  const applyUpdate = useAppStore((s) => s.applyUpdate);

  const [newDamageType, setNewDamageType] = useState("");
  const [addingStat, setAddingStat] = useState(false);
  const [statName, setStatName] = useState("");
  const [statType, setStatType] = useState<StatValueType>("simple");
  const [derivesModifier, setDerivesModifier] = useState(false);

  const isCustom = ruleset.id.startsWith("custom-");

  async function addDamageType() {
    const name = newDamageType.trim();
    if (!name) return;
    const id = slugify(name) || generateId();
    if (ruleset.damageTypes.some((d) => d.id === id)) return;
    await saveRuleset({ ...ruleset, damageTypes: [...ruleset.damageTypes, { id, name }] });
    setNewDamageType("");
  }

  async function removeDamageType(id: string) {
    await saveRuleset({ ...ruleset, damageTypes: ruleset.damageTypes.filter((d) => d.id !== id) });
  }

  async function addStatDefinitions(defs: Omit<StatDefinition, "id">[]) {
    const additions: StatDefinition[] = [];
    for (const def of defs) {
      const id = slugify(def.name);
      if (!id || ruleset.statDefinitions.some((s) => s.id === id) || additions.some((a) => a.id === id)) continue;
      additions.push({ ...def, id });
    }
    if (additions.length === 0) return;

    await saveRuleset({ ...ruleset, statDefinitions: [...ruleset.statDefinitions, ...additions] });

    const nonCalculated = additions.filter((d) => d.valueType !== "calculated");
    if (nonCalculated.length === 0) return;

    const before = character.stats;
    const after: Record<string, CharacterStat> = { ...before };
    for (const def of nonCalculated) {
      const value = def.defaultValue ?? 0;
      after[def.id] = {
        statDefId: def.id,
        current: value,
        base: value,
        ...(def.valueType === "currentMax" ? { max: value } : {}),
      };
    }
    const transaction = buildTransaction({
      characterId: character.id,
      type: "stat_definition_added",
      summary: `Added statistic${additions.length > 1 ? "s" : ""}: ${additions.map((a) => a.name).join(", ")}`,
      patch: [{ path: "stats", before, after }],
    });
    await applyUpdate({ ...character, stats: after }, transaction);
  }

  async function addCustomStat() {
    if (!statName.trim()) return;
    await addStatDefinitions([
      {
        name: statName.trim(),
        valueType: statType,
        derivesModifier: statType === "simple" ? derivesModifier : undefined,
        min: derivesModifier ? 1 : undefined,
        max: derivesModifier ? 30 : undefined,
        defaultValue: statType === "currentMax" ? 10 : derivesModifier ? 10 : 0,
      },
    ]);
    setStatName("");
    setStatType("simple");
    setDerivesModifier(false);
    setAddingStat(false);
  }

  async function removeStat(id: string) {
    if (id === "hp") return;
    await saveRuleset({ ...ruleset, statDefinitions: ruleset.statDefinitions.filter((s) => s.id !== id) });
  }

  if (!isCustom) {
    return (
      <div className="empty-state card">
        <p>
          "{ruleset.name}" is a built-in system, so its damage types and statistics are fixed. Create a character with a custom
          system to define your own.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card">
        <h3>Damage Types</h3>
        <p className="hint">The kinds of damage your custom system uses — add as many as you need.</p>
        <div className="tag-list" style={{ marginBottom: "var(--space-3)" }}>
          {ruleset.damageTypes.map((dt) => (
            <span className="badge" key={dt.id}>
              {dt.name}
              <button className="link-button" style={{ marginLeft: 4 }} onClick={() => removeDamageType(dt.id)}>
                {"✕"}
              </button>
            </span>
          ))}
        </div>
        <div className="row">
          <input
            value={newDamageType}
            onChange={(e) => setNewDamageType(e.target.value)}
            placeholder="e.g. Shadow, Arcane, Bleed"
            onKeyDown={(e) => e.key === "Enter" && addDamageType()}
          />
          <button className="button" onClick={addDamageType}>
            + Add
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Statistics</h3>
        <p className="hint">Every stat this character sheet can track — add classic ability scores or your own.</p>
        <div className="stack" style={{ marginBottom: "var(--space-3)" }}>
          {ruleset.statDefinitions.map((def) => (
            <div className="row" key={def.id}>
              <span>
                {def.name} <span className="hint">({def.valueType}{def.derivesModifier ? ", has modifier" : ""})</span>
              </span>
              {def.id !== "hp" && (
                <button className="link-button" onClick={() => removeStat(def.id)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <button className="button" onClick={() => addStatDefinitions(CLASSIC_ABILITY_SCORES)}>
          + Add Classic Ability Scores (Str/Dex/Con/Int/Wis/Cha)
        </button>

        {addingStat ? (
          <div className="card" style={{ background: "var(--color-surface-alt)", marginTop: "var(--space-3)" }}>
            <div className="field">
              <label>What is this statistic called?</label>
              <input value={statName} onChange={(e) => setStatName(e.target.value)} placeholder="e.g. Sanity" autoFocus />
            </div>
            <div className="field">
              <label>What kind of value is it?</label>
              <select value={statType} onChange={(e) => setStatType(e.target.value as StatValueType)}>
                <option value="simple">Simple number</option>
                <option value="currentMax">Current / Maximum</option>
                <option value="counter">Counter</option>
              </select>
            </div>
            {statType === "simple" && (
              <label className="toggle-row">
                <input type="checkbox" checked={derivesModifier} onChange={(e) => setDerivesModifier(e.target.checked)} />
                This is an ability score with an automatic modifier (like Strength)
              </label>
            )}
            <div className="row">
              <button className="button" onClick={() => setAddingStat(false)}>
                Cancel
              </button>
              <button className="button button-primary" onClick={addCustomStat}>
                Add
              </button>
            </div>
          </div>
        ) : (
          <button className="button button-block" style={{ marginTop: "var(--space-2)" }} onClick={() => setAddingStat(true)}>
            + Add Statistic
          </button>
        )}
      </div>
    </div>
  );
}
