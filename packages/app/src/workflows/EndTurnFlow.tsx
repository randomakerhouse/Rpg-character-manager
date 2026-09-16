import { useMemo } from "react";
import { advanceConditionDurations, previewTurnEnd, previewTurnStart, rechargeUses } from "@rpg/engine";
import Sheet from "../components/Sheet.js";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";

export default function EndTurnFlow({ onClose }: { onClose: () => void }) {
  const { character } = useCharacterContext();
  const applyUpdate = useAppStore((s) => s.applyUpdate);

  const reminders = useMemo(() => {
    const end = previewTurnEnd(character);
    const start = previewTurnStart(character);
    return [...end.auto, ...end.prompt, ...end.manual, ...start.auto, ...start.prompt, ...start.manual];
  }, [character]);

  async function confirm() {
    const { character: afterDurations, expired, transaction } = advanceConditionDurations(character);
    const recharged = rechargeUses(rechargeUses(afterDurations, "turnEnd"), "turnStart");
    await applyUpdate(recharged, transaction);
    if (expired.length > 0) {
      // eslint-disable-next-line no-console
      console.info("Conditions expired:", expired);
    }
    onClose();
  }

  return (
    <Sheet title="End Turn" onClose={onClose}>
      {reminders.length > 0 && (
        <>
          <p className="hint">Before you end your turn:</p>
          <div className="stack">
            {reminders.map((r) => (
              <div className="row" key={r.id}>
                <span>{r.name}</span>
                {r.description && <span className="hint">{r.description}</span>}
              </div>
            ))}
          </div>
        </>
      )}
      <p className="hint">Active condition durations will count down, and any uses that recharge each turn will reset.</p>
      <button className="button button-primary button-block" onClick={confirm}>
        End Turn
      </button>
    </Sheet>
  );
}
