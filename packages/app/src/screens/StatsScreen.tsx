import { useState } from "react";
import { buildTransaction, resolveAllStats } from "@rpg/engine";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";
import ExplainableStat from "../components/ExplainableStat.js";
import LevelUpFlow from "../workflows/LevelUpFlow.js";

export default function StatsScreen() {
  const { character, ruleset } = useCharacterContext();
  const applyUpdate = useAppStore((s) => s.applyUpdate);
  const resolved = resolveAllStats(character, ruleset);
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, string>>({});
  const [levelingUp, setLevelingUp] = useState(false);

  async function updateStat(statId: string, field: "current" | "max", value: number) {
    const stat = character.stats[statId];
    if (!stat) return;
    const before = stat[field] ?? 0;
    const nextStat = { ...stat, [field]: value };
    const transaction = buildTransaction({
      characterId: character.id,
      type: "stat_edit",
      summary: `Set ${ruleset.statDefinitions.find((d) => d.id === statId)?.name ?? statId} ${field} to ${value}`,
      patch: [{ path: `stats.${statId}.${field}`, before, after: value }],
    });
    await applyUpdate({ ...character, stats: { ...character.stats, [statId]: nextStat } }, transaction);
  }

  async function setOverride(statId: string, value: number | null, reason: string) {
    const stat = character.stats[statId] ?? { statDefId: statId, current: 0, base: 0 };
    const before = stat.manualOverride;
    const nextStat = { ...stat, manualOverride: value === null ? undefined : { value, reason } };
    const transaction = buildTransaction({
      characterId: character.id,
      type: "stat_override",
      summary: value === null ? `Cleared override on ${statId}` : `Overrode ${statId} to ${value} (${reason})`,
      patch: [{ path: `stats.${statId}.manualOverride`, before, after: nextStat.manualOverride }],
    });
    await applyUpdate({ ...character, stats: { ...character.stats, [statId]: nextStat } }, transaction);
  }

  return (
    <div className="stack">
      <div className="card row">
        <span>
          Level <strong>{character.level}</strong>
        </span>
        <button className="button button-primary" onClick={() => setLevelingUp(true)}>
          {"⬆️"} Level Up
        </button>
      </div>

      {ruleset.statDefinitions.map((def) => {
        const stat = character.stats[def.id];
        const r = resolved[def.id]!;
        const draft = overrideDrafts[def.id];

        return (
          <div className="card" key={def.id}>
            <div className="row">
              <h3 style={{ margin: 0 }}>{def.name}</h3>
              <span className="hint">{def.valueType}</span>
            </div>

            {def.valueType === "calculated" ? (
              <ExplainableStat label={def.name} resolved={r} />
            ) : def.valueType === "currentMax" ? (
              <div className="row">
                <div className="field" style={{ flex: 1 }}>
                  <label>Current</label>
                  <input
                    type="number"
                    value={stat?.current ?? 0}
                    onChange={(e) => updateStat(def.id, "current", Number(e.target.value))}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Maximum</label>
                  <input type="number" value={stat?.max ?? 0} onChange={(e) => updateStat(def.id, "max", Number(e.target.value))} />
                </div>
              </div>
            ) : (
              <div className="field">
                <input type="number" value={stat?.current ?? 0} onChange={(e) => updateStat(def.id, "current", Number(e.target.value))} />
              </div>
            )}

            <details>
              <summary className="hint" style={{ cursor: "pointer" }}>
                {stat?.manualOverride ? `Manually overridden to ${stat.manualOverride.value}` : "Manual override"}
              </summary>
              <div className="row">
                <input
                  type="number"
                  placeholder="Override value"
                  value={draft ?? ""}
                  onChange={(e) => setOverrideDrafts((prev) => ({ ...prev, [def.id]: e.target.value }))}
                />
                <button
                  className="button"
                  onClick={() => {
                    if (draft === undefined || draft === "") return;
                    void setOverride(def.id, Number(draft), "Manual override");
                  }}
                >
                  Apply
                </button>
                {stat?.manualOverride && (
                  <button className="button" onClick={() => setOverride(def.id, null, "")}>
                    Clear
                  </button>
                )}
              </div>
            </details>
          </div>
        );
      })}

      {levelingUp && <LevelUpFlow onClose={() => setLevelingUp(false)} />}
    </div>
  );
}
