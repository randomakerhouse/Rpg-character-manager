import { useMemo, useState } from "react";
import type { TriggerableEntry } from "@rpg/engine";
import { applyHeal, calculateHeal, previewHeal } from "@rpg/engine";
import Sheet from "../components/Sheet.js";
import TraceView from "../components/TraceView.js";
import ModifierChecklist from "../components/ModifierChecklist.js";
import ManualOverrideField from "./ManualOverrideField.js";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";

export default function HealFlow({ onClose }: { onClose: () => void }) {
  const { character, ruleset } = useCharacterContext();
  const applyUpdate = useAppStore((s) => s.applyUpdate);

  const [amount, setAmount] = useState(0);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [overrideValue, setOverrideValue] = useState<number | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const preview = useMemo(() => previewHeal(character, amount), [character, amount]);
  const acceptedEntries: TriggerableEntry[] = useMemo(
    () =>
      [...preview.matched.auto, ...preview.matched.prompt, ...preview.matched.manual].filter(
        (e) => e.activationMode === "AUTO" || acceptedIds.has(e.id),
      ),
    [preview, acceptedIds],
  );
  const pipelineResult = useMemo(
    () => calculateHeal(amount, preview.context, acceptedEntries, ruleset),
    [amount, preview, acceptedEntries, ruleset],
  );

  function toggle(entry: TriggerableEntry) {
    setAcceptedIds((prev) => {
      const next = new Set(prev);
      next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id);
      return next;
    });
  }

  async function confirm() {
    const finalHealing = overrideValue ?? pipelineResult.trace.finalValue;
    const { character: updated, transaction } = applyHeal({
      character,
      finalHealing,
      trace: pipelineResult.trace,
      manualOverride:
        overrideValue !== null
          ? { calculatedValue: pipelineResult.trace.finalValue, overriddenValue: overrideValue, reason: overrideReason || "Manual override" }
          : undefined,
    });
    await applyUpdate(updated, transaction);
    onClose();
  }

  return (
    <Sheet title="Heal" onClose={onClose}>
      <div className="field">
        <label>Healing amount</label>
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} autoFocus />
      </div>
      {amount > 0 && (
        <>
          <ModifierChecklist matched={preview.matched} acceptedIds={acceptedIds} onToggle={toggle} />
          <TraceView trace={pipelineResult.trace} />
          <ManualOverrideField
            calculatedValue={pipelineResult.trace.finalValue}
            overrideValue={overrideValue}
            reason={overrideReason}
            onOverrideChange={setOverrideValue}
            onReasonChange={setOverrideReason}
          />
        </>
      )}
      <button className="button button-primary button-block" disabled={amount <= 0} onClick={confirm}>
        Confirm — Heal {overrideValue ?? pipelineResult.trace.finalValue}
      </button>
    </Sheet>
  );
}
