import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { StatDefinition } from "@rpg/engine";
import { createCharacter, createStarterCustomRuleset, dnd5eRuleset, generateId } from "@rpg/engine";
import { useAppStore } from "../../state/appStore.js";
import ImagePicker from "../../components/ImagePicker.js";

type StatValue = { current: number; max?: number };

const STEP_LABELS = ["Basic Info", "Statistics", "Review"];

export default function CreateCharacterWizard() {
  const navigate = useNavigate();
  const saveCharacter = useAppStore((s) => s.saveCharacter);
  const saveRuleset = useAppStore((s) => s.saveRuleset);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [level, setLevel] = useState(1);
  const [rulesetChoice, setRulesetChoice] = useState<"dnd5e" | "custom">("dnd5e");
  const [customStats, setCustomStats] = useState<StatDefinition[]>([]);
  const [statValues, setStatValues] = useState<Record<string, StatValue>>({});
  const [newStatDraft, setNewStatDraft] = useState<{ name: string; valueType: "simple" | "currentMax" | "counter" } | null>(
    null,
  );

  const ruleset =
    rulesetChoice === "dnd5e"
      ? dnd5eRuleset
      : {
          ...createStarterCustomRuleset(`custom-${name || "ruleset"}`, `${name || "Custom"} Ruleset`),
          statDefinitions: [
            ...createStarterCustomRuleset("tmp", "tmp").statDefinitions,
            ...customStats,
          ],
        };

  const editableStats = ruleset.statDefinitions.filter((s) => s.valueType !== "calculated");
  const computedStats = ruleset.statDefinitions.filter((s) => s.valueType === "calculated");

  function updateStatValue(statId: string, patch: Partial<StatValue>) {
    setStatValues((prev) => ({ ...prev, [statId]: { ...prev[statId], ...patch } }));
  }

  function addCustomStat() {
    if (!newStatDraft || !newStatDraft.name.trim()) return;
    const id = newStatDraft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setCustomStats((prev) => [
      ...prev,
      { id, name: newStatDraft.name.trim(), valueType: newStatDraft.valueType, defaultValue: 0 },
    ]);
    setNewStatDraft(null);
  }

  async function handleCreate() {
    const finalRuleset = rulesetChoice === "custom" ? { ...ruleset, id: `custom-${generateId()}` } : ruleset;
    if (rulesetChoice === "custom") await saveRuleset(finalRuleset);

    const character = {
      ...createCharacter({
        name: name.trim() || "Unnamed Character",
        level,
        ruleset: finalRuleset,
        statValues,
      }),
      imageUrl,
    };
    await saveCharacter(character);
    navigate(`/characters/${character.id}`);
  }

  return (
    <div className="app-shell">
      <main className="app-main" style={{ maxWidth: 640 }}>
        <div className="top-bar" style={{ position: "static", marginBottom: "var(--space-4)" }}>
          <button className="button button-ghost" onClick={() => navigate("/")}>
            {"←"} Cancel
          </button>
          <h1>New Character</h1>
          <span />
        </div>

        <div className="wizard-steps">
          {STEP_LABELS.map((_, i) => (
            <div key={i} className={`dot ${i <= step ? "active" : ""}`} />
          ))}
        </div>
        <p className="hint">
          Step {step + 1} of {STEP_LABELS.length} — {STEP_LABELS[step]}
        </p>

        {step === 0 && (
          <div className="card">
            <div className="field">
              <label>Character image</label>
              <ImagePicker imageUrl={imageUrl} name={name || "?"} onChange={setImageUrl} />
            </div>
            <div className="field">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Character name" autoFocus />
            </div>
            <div className="field">
              <label>Level</label>
              <input type="number" min={1} value={level} onChange={(e) => setLevel(Number(e.target.value) || 1)} />
            </div>
            <div className="field">
              <label>System</label>
              <select value={rulesetChoice} onChange={(e) => setRulesetChoice(e.target.value as "dnd5e" | "custom")}>
                <option value="dnd5e">Dungeons & Dragons 5th Edition</option>
                <option value="custom">Custom system</option>
              </select>
              <span className="hint">
                {rulesetChoice === "dnd5e"
                  ? "Standard ability scores, HP, AC and the usual damage types are set up for you."
                  : "Start minimal — you add your own stats, damage types and rules as you go."}
              </span>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="card">
            <h3>Statistics</h3>
            <div className="stack">
              {editableStats.map((def) => (
                <div className="field" key={def.id}>
                  <label>{def.name}</label>
                  {def.valueType === "currentMax" ? (
                    <div className="row">
                      <input
                        type="number"
                        value={statValues[def.id]?.current ?? def.defaultValue ?? 0}
                        onChange={(e) => updateStatValue(def.id, { current: Number(e.target.value) })}
                        placeholder="Current"
                      />
                      <input
                        type="number"
                        value={statValues[def.id]?.max ?? def.defaultValue ?? 0}
                        onChange={(e) => updateStatValue(def.id, { max: Number(e.target.value) })}
                        placeholder="Maximum"
                      />
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={statValues[def.id]?.current ?? def.defaultValue ?? 0}
                      onChange={(e) => updateStatValue(def.id, { current: Number(e.target.value) })}
                    />
                  )}
                </div>
              ))}
            </div>

            {computedStats.length > 0 && (
              <p className="hint">
                {computedStats.map((s) => s.name).join(", ")} will be calculated automatically from these values.
              </p>
            )}

            {rulesetChoice === "custom" && (
              <div style={{ marginTop: "var(--space-4)" }}>
                <h3>Custom Stats</h3>
                {customStats.length > 0 && (
                  <ul>
                    {customStats.map((s) => (
                      <li key={s.id}>
                        {s.name} ({s.valueType})
                      </li>
                    ))}
                  </ul>
                )}
                {newStatDraft ? (
                  <div className="card" style={{ background: "var(--color-surface-alt)" }}>
                    <div className="field">
                      <label>What is this statistic called?</label>
                      <input
                        value={newStatDraft.name}
                        onChange={(e) => setNewStatDraft({ ...newStatDraft, name: e.target.value })}
                        placeholder="e.g. Sanity"
                        autoFocus
                      />
                    </div>
                    <div className="field">
                      <label>What kind of value is it?</label>
                      <select
                        value={newStatDraft.valueType}
                        onChange={(e) =>
                          setNewStatDraft({ ...newStatDraft, valueType: e.target.value as typeof newStatDraft.valueType })
                        }
                      >
                        <option value="simple">Simple number</option>
                        <option value="currentMax">Current / Maximum</option>
                        <option value="counter">Counter</option>
                      </select>
                    </div>
                    <div className="row">
                      <button className="button" onClick={() => setNewStatDraft(null)}>
                        Cancel
                      </button>
                      <button className="button button-primary" onClick={addCustomStat}>
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="button" onClick={() => setNewStatDraft({ name: "", valueType: "simple" })}>
                    + Add Stat
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <h3>Review</h3>
            <p>
              <strong>{name || "Unnamed Character"}</strong>, level {level}
            </p>
            <p className="hint">System: {ruleset.name}</p>
            <ul>
              {editableStats.map((def) => {
                const v = statValues[def.id];
                return (
                  <li key={def.id}>
                    {def.name}: {v?.current ?? def.defaultValue ?? 0}
                    {def.valueType === "currentMax" ? ` / ${v?.max ?? def.defaultValue ?? 0}` : ""}
                  </li>
                );
              })}
            </ul>
            <p className="hint">You can add weapons, abilities, spells and inventory items after creating the character.</p>
          </div>
        )}

        <div className="row">
          <button className="button" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </button>
          {step < STEP_LABELS.length - 1 ? (
            <button className="button button-primary" onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !name.trim()}>
              Next
            </button>
          ) : (
            <button className="button button-primary" onClick={handleCreate}>
              Create Character
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
