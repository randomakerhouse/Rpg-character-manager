import { useMemo, useState } from "react";
import type { TriggerableEntry } from "@rpg/engine";
import { applyTakeDamage, calculateTakeDamage, previewTakeDamage } from "@rpg/engine";
import Sheet from "../components/Sheet.js";
import TraceView from "../components/TraceView.js";
import ModifierChecklist from "../components/ModifierChecklist.js";
import ManualOverrideField from "./ManualOverrideField.js";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";

export default function TakeDamageFlow({ onClose }: { onClose: () => void }) {
  const { character, ruleset } = useCharacterContext();
  const applyUpdate = useAppStore((s) => s.applyUpdate);

  const [phase, setPhase] = useState<"input" | "preview">("input");
  const [amount, setAmount] = useState(0);
  const [damageType, setDamageType] = useState(ruleset.damageTypes[0]?.id ?? "");
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [overrideValue, setOverrideValue] = useState<number | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const preview = useMemo(() => (phase === "preview" ? previewTakeDamage(character, amount, damageType) : null), [
    phase,
    character,
    amount,
    damageType,
  ]);

  const acceptedEntries: TriggerableEntry[] = useMemo(() => {
    if (!preview) return [];
    return [...preview.matched.auto, ...preview.matched.prompt, ...preview.matched.manual].filter(
      (e) => e.activationMode === "AUTO" || acceptedIds.has(e.id),
    );
  }, [preview, acceptedIds]);

  const pipelineResult = useMemo(() => {
    if (!preview) return null;
    return calculateTakeDamage(amount, preview.context, acceptedEntries, ruleset);
  }, [preview, acceptedEntries, amount, ruleset]);

  function toggle(entry: TriggerableEntry) {
    setAcceptedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entry.id)) next.delete(entry.id);
      else next.add(entry.id);
      return next;
    });
  }

  async function confirm() {
    if (!preview || !pipelineResult) return;
    const finalDamage = overrideValue ?? pipelineResult.trace.finalValue;
    const { character: updated, transaction } = applyTakeDamage({
      character,
      finalDamage,
      trace: pipelineResult.trace,
      sideEffects: pipelineResult.sideEffects,
      ruleset,
      context: preview.context,
      manualOverride:
        overrideValue !== null
          ? { calculatedValue: pipelineResult.trace.finalValue, overriddenValue: overrideValue, reason: overrideReason || "Manual override" }
          : undefined,
    });
    await applyUpdate(updated, transaction);
    onClose();
  }

  return (
    <Sheet title="Take Damage" onClose={onClose}>
      {phase === "input" && (
        <>
          <div className="field">
            <label>Damage amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} autoFocus />
          </div>
          <div className="field">
            <label>Damage type</label>
            <select value={damageType} onChange={(e) => setDamageType(e.target.value)}>
              {ruleset.damageTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.name}
                </option>
              ))}
            </select>
          </div>
          <button className="button button-primary button-block" onClick={() => setPhase("preview")} disabled={amount <= 0}>
            Continue
          </button>
        </>
      )}

      {phase === "preview" && preview && pipelineResult && (
        <>
          <p className="hint">
            Incoming: {amount} {ruleset.damageTypes.find((d) => d.id === damageType)?.name ?? damageType}
          </p>
          <ModifierChecklist matched={preview.matched} acceptedIds={acceptedIds} onToggle={toggle} />
          <TraceView trace={pipelineResult.trace} />
          <ManualOverrideField
            calculatedValue={pipelineResult.trace.finalValue}
            overrideValue={overrideValue}
            reason={overrideReason}
            onOverrideChange={setOverrideValue}
            onReasonChange={setOverrideReason}
          />
          <div className="row">
            <button className="button" onClick={() => setPhase("input")}>
              Back
            </button>
            <button className="button button-primary" onClick={confirm}>
              Confirm — Apply {overrideValue ?? pipelineResult.trace.finalValue} damage
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
