import { useState } from "react";
import { useCharacterContext } from "../state/CharacterContext.js";
import StatBar from "../components/StatBar.js";
import AttackFlow from "../workflows/AttackFlow.js";
import TakeDamageFlow from "../workflows/TakeDamageFlow.js";
import HealFlow from "../workflows/HealFlow.js";
import UseAbilityFlow from "../workflows/UseAbilityFlow.js";
import AddConditionFlow from "../workflows/AddConditionFlow.js";
import QuickEffectFlow from "../workflows/QuickEffectFlow.js";
import EndTurnFlow from "../workflows/EndTurnFlow.js";

type Workflow = "attack" | "damage" | "heal" | "ability" | "condition" | "quick" | "endturn" | null;

export default function CombatScreen() {
  const { character, ruleset } = useCharacterContext();
  const [workflow, setWorkflow] = useState<Workflow>(null);
  const hp = character.stats.hp;

  return (
    <div className="stack">
      {hp && (
        <div className="card">
          <StatBar label="Hit Points" current={hp.current} max={hp.max ?? hp.current} />
        </div>
      )}

      {character.activeConditions.length > 0 && (
        <div className="tag-list">
          {character.activeConditions.map((ac) => {
            const def = ruleset.conditionDefinitions.find((d) => d.id === ac.conditionDefId);
            return (
              <span className="badge" key={ac.id}>
                {def?.name ?? ac.conditionDefId}
                {ac.remaining ? ` · ${ac.remaining.amount}` : ""}
              </span>
            );
          })}
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
        <button className="button button-big" onClick={() => setWorkflow("ability")}>
          {"\u{1F31F}"} Use Ability
        </button>
        <button className="button button-big" onClick={() => setWorkflow("condition")}>
          {"\u{1F32B}️"} Add Condition
        </button>
        <button className="button button-big" onClick={() => setWorkflow("quick")}>
          {"⚡"} Quick Effect
        </button>
      </div>

      <button className="button button-block button-big" onClick={() => setWorkflow("endturn")}>
        End Turn {"↻"}
      </button>

      {workflow === "attack" && <AttackFlow onClose={() => setWorkflow(null)} />}
      {workflow === "damage" && <TakeDamageFlow onClose={() => setWorkflow(null)} />}
      {workflow === "heal" && <HealFlow onClose={() => setWorkflow(null)} />}
      {workflow === "ability" && <UseAbilityFlow onClose={() => setWorkflow(null)} />}
      {workflow === "condition" && <AddConditionFlow onClose={() => setWorkflow(null)} />}
      {workflow === "quick" && <QuickEffectFlow onClose={() => setWorkflow(null)} />}
      {workflow === "endturn" && <EndTurnFlow onClose={() => setWorkflow(null)} />}
    </div>
  );
}
