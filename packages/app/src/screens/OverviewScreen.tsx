import { useState } from "react";
import { abilityModifier, resolveAllStats } from "@rpg/engine";
import { useCharacterContext } from "../state/CharacterContext.js";
import StatBar from "../components/StatBar.js";
import ExplainableStat from "../components/ExplainableStat.js";
import TakeDamageFlow from "../workflows/TakeDamageFlow.js";
import HealFlow from "../workflows/HealFlow.js";
import AttackFlow from "../workflows/AttackFlow.js";

export default function OverviewScreen() {
  const { character, ruleset } = useCharacterContext();
  const [workflow, setWorkflow] = useState<"attack" | "damage" | "heal" | null>(null);

  const resolved = resolveAllStats(character, ruleset);
  const hp = character.stats.hp;
  const tempHp = character.stats.temporaryHp;

  const abilityIds = ruleset.statDefinitions.filter((d) => d.derivesModifier).map((d) => d.id);
  const calculatedIds = ruleset.statDefinitions.filter((d) => d.valueType === "calculated").map((d) => d.id);
  const otherIds = ruleset.statDefinitions
    .filter((d) => d.valueType !== "calculated" && !d.derivesModifier && d.id !== "hp" && d.id !== "temporaryHp")
    .map((d) => d.id);

  return (
    <div className="stack">
      {hp && (
        <div className="card">
          <StatBar label="Hit Points" current={hp.current} max={hp.max ?? hp.current} />
          {tempHp && tempHp.current > 0 && <p className="hint">+{tempHp.current} temporary HP</p>}
        </div>
      )}

      <div className="combat-grid">
        <button className="button button-primary button-big" onClick={() => setWorkflow("attack")}>
          {"⚔️"} Attack
        </button>
        <button className="button button-danger button-big" onClick={() => setWorkflow("damage")}>
          {"\u{1F6E1}"} Take Damage
        </button>
        <button className="button button-big" onClick={() => setWorkflow("heal")}>
          {"❤️"} Heal
        </button>
      </div>

      {calculatedIds.length > 0 && (
        <div className="grid">
          {calculatedIds.map((id) => (
            <ExplainableStat key={id} label={ruleset.statDefinitions.find((d) => d.id === id)!.name} resolved={resolved[id]!} />
          ))}
        </div>
      )}

      {abilityIds.length > 0 && (
        <div className="card">
          <h3>Ability Scores</h3>
          <div className="grid">
            {abilityIds.map((id) => {
              const def = ruleset.statDefinitions.find((d) => d.id === id)!;
              const mod = abilityModifier(resolved[id]!.value);
              return (
                <div key={id} className="card" style={{ marginBottom: 0, textAlign: "center" }}>
                  <div className="hint">{def.name}</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{resolved[id]!.value}</div>
                  <div className="hint">{mod >= 0 ? `+${mod}` : mod}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {otherIds.length > 0 && (
        <div className="card">
          <div className="grid">
            {otherIds.map((id) => (
              <div key={id}>
                <div className="hint">{ruleset.statDefinitions.find((d) => d.id === id)!.name}</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{resolved[id]!.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(character.resources).length > 0 && (
        <div className="card">
          <h3>Resources</h3>
          <div className="stack">
            {Object.values(character.resources).map((r) => {
              const def = ruleset.resourceDefinitions.find((d) => d.id === r.resourceDefId);
              return <StatBar key={r.resourceDefId} label={def?.name ?? r.resourceDefId} current={r.current} max={r.max} />;
            })}
          </div>
        </div>
      )}

      {character.activeConditions.length > 0 && (
        <div className="card">
          <h3>Conditions</h3>
          <div className="tag-list">
            {character.activeConditions.map((ac) => {
              const def = ruleset.conditionDefinitions.find((d) => d.id === ac.conditionDefId);
              return (
                <span className="badge" key={ac.id}>
                  {def?.name ?? ac.conditionDefId}
                  {ac.remaining ? ` · ${ac.remaining.amount} ${ac.remaining.kind}` : ""}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {workflow === "attack" && <AttackFlow onClose={() => setWorkflow(null)} />}
      {workflow === "damage" && <TakeDamageFlow onClose={() => setWorkflow(null)} />}
      {workflow === "heal" && <HealFlow onClose={() => setWorkflow(null)} />}
    </div>
  );
}
