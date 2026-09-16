import { useMemo, useState } from "react";
import type { Modifier, PipelineStage } from "@rpg/engine";
import { buildTransaction, generateId, literal, statCalculatedTrigger } from "@rpg/engine";
import { CORE_EVENTS } from "@rpg/engine";
import Sheet from "../components/Sheet.js";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";

const BASE_TARGETS: { id: string; label: string; trigger: string; stage: PipelineStage; op: "add" | "subtract" }[] = [
  { id: "attack", label: "Attack Rolls", trigger: CORE_EVENTS.attackRoll, stage: "additive", op: "add" },
  { id: "damage", label: "Incoming Damage (reduction)", trigger: CORE_EVENTS.beforeDamageReceived, stage: "flatReduction", op: "subtract" },
  { id: "healing", label: "Healing Received", trigger: CORE_EVENTS.healingReceived, stage: "additive", op: "add" },
];

/** Section 45: a fast way to add a DM-granted temporary bonus mid-session without leaving the table. */
export default function QuickEffectFlow({ onClose }: { onClose: () => void }) {
  const { character, ruleset } = useCharacterContext();
  const applyUpdate = useAppStore((s) => s.applyUpdate);

  const targets = useMemo(
    () => [
      ...BASE_TARGETS,
      ...ruleset.statDefinitions.map((d) => ({
        id: `stat:${d.id}`,
        label: d.name,
        trigger: statCalculatedTrigger(d.id),
        stage: "additive" as PipelineStage,
        op: "add" as const,
      })),
    ],
    [ruleset],
  );

  const [name, setName] = useState("");
  const [targetId, setTargetId] = useState(targets[0]!.id);
  const [amount, setAmount] = useState(2);
  const [duration, setDuration] = useState(3);

  async function confirm() {
    const target = targets.find((t) => t.id === targetId)!;
    const modifier: Modifier = {
      id: generateId(),
      name: name.trim() || "Quick Effect",
      humanReadableSummary: `${target.op === "add" ? (amount >= 0 ? "+" : "") : "-"}${amount} to ${target.label}`,
      sourceRef: { kind: "condition", activeConditionId: "pending" },
      trigger: target.trigger,
      conditions: null,
      effects: [{ op: target.op, stage: target.stage, target: "workingValue", value: literal(amount) }],
      activationMode: "AUTO",
      priority: 0,
      enabled: true,
    };

    const activeConditionId = generateId();
    const before = character.activeConditions;
    const after = [
      ...before,
      {
        id: activeConditionId,
        conditionDefId: `quick-effect-${modifier.name}`,
        remaining: { kind: "turns" as const, amount: duration },
        modifiers: [{ ...modifier, sourceRef: { kind: "condition" as const, activeConditionId } }],
      },
    ];

    const transaction = buildTransaction({
      characterId: character.id,
      type: "quick_effect",
      summary: `Added quick effect: ${modifier.name}`,
      patch: [{ path: "activeConditions", before, after }],
    });

    await applyUpdate({ ...character, activeConditions: after }, transaction);
    onClose();
  }

  return (
    <Sheet title="Quick Effect" onClose={onClose}>
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DM Blessing" autoFocus />
      </div>
      <div className="field">
        <label>Affects</label>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          <optgroup label="Rolls">
            {BASE_TARGETS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Statistics">
            {ruleset.statDefinitions.map((d) => (
              <option key={d.id} value={`stat:${d.id}`}>
                {d.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label>Amount</label>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Duration (turns)</label>
          <input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </div>
      </div>
      <button className="button button-primary button-block" onClick={confirm}>
        Add
      </button>
    </Sheet>
  );
}
