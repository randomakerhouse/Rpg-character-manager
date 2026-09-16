import { useMemo, useState } from "react";
import type { PatchEntry, RollMode, TriggerableEntry, Weapon } from "@rpg/engine";
import {
  buildBaselineAttackEntries,
  buildTransaction,
  calculateAttackRoll,
  consumeEntryUse,
  previewAttackRoll,
  previewWeaponHitBonuses,
  rollAttackDie,
  rollWeaponDamage,
} from "@rpg/engine";
import Sheet from "../components/Sheet.js";
import TraceView from "../components/TraceView.js";
import ModifierChecklist from "../components/ModifierChecklist.js";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";

const UNARMED: Weapon = {
  id: "__unarmed__",
  name: "Unarmed Strike",
  damageComponents: [{ dice: "1", damageType: "bludgeoning" }],
  tags: ["unarmed"],
  equipped: true,
  modifiers: [],
};

type Phase = "source" | "roll" | "result" | "damage";

export default function AttackFlow({ onClose }: { onClose: () => void }) {
  const { character, ruleset } = useCharacterContext();
  const applyUpdate = useAppStore((s) => s.applyUpdate);

  const weapons = [...character.weapons, UNARMED];
  const [phase, setPhase] = useState<Phase>("source");
  const [weaponId, setWeaponId] = useState<string | null>(null);
  const [rollMode, setRollMode] = useState<RollMode>(ruleset.rollConfig.defaultRollMode);
  const [naturalRoll, setNaturalRoll] = useState<number | null>(null);
  const [acceptedRollIds, setAcceptedRollIds] = useState<Set<string>>(new Set());
  const [hit, setHit] = useState<boolean | null>(null);
  const [critical, setCritical] = useState(false);
  const [acceptedBonusIds, setAcceptedBonusIds] = useState<Set<string>>(new Set());
  const [damageResult, setDamageResult] = useState<ReturnType<typeof rollWeaponDamage> | null>(null);

  const weapon = weapons.find((w) => w.id === weaponId) ?? null;

  const rollPreview = useMemo(() => (weapon && naturalRoll !== null ? previewAttackRoll(character, weapon, naturalRoll) : null), [
    character,
    weapon,
    naturalRoll,
  ]);

  const baseline = useMemo(() => (weapon ? buildBaselineAttackEntries(character, ruleset, weapon) : []), [character, ruleset, weapon]);

  const rollEntries: TriggerableEntry[] = useMemo(() => {
    if (!rollPreview) return baseline;
    const optional = [...rollPreview.matched.prompt, ...rollPreview.matched.manual].filter((e) => acceptedRollIds.has(e.id));
    return [...baseline, ...rollPreview.matched.auto, ...optional];
  }, [rollPreview, baseline, acceptedRollIds]);

  const rollResult = useMemo(
    () => (rollPreview && naturalRoll !== null ? calculateAttackRoll(naturalRoll, rollPreview.context, rollEntries, ruleset) : null),
    [rollPreview, naturalRoll, rollEntries, ruleset],
  );

  const hitBonusPreview = useMemo(() => (weapon ? previewWeaponHitBonuses(character, weapon) : null), [character, weapon]);

  function rollDigitally() {
    const result = rollAttackDie(ruleset, rollMode);
    setNaturalRoll(result.kept);
  }

  function toggleRollEntry(entry: TriggerableEntry) {
    setAcceptedRollIds((prev) => {
      const next = new Set(prev);
      next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id);
      return next;
    });
  }

  function toggleBonusEntry(entry: TriggerableEntry) {
    setAcceptedBonusIds((prev) => {
      const next = new Set(prev);
      next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id);
      return next;
    });
  }

  function rollDamage() {
    if (!weapon || !hitBonusPreview) return;
    const accepted = [...hitBonusPreview.prompt, ...hitBonusPreview.manual].filter((e) => acceptedBonusIds.has(e.id));
    setDamageResult(rollWeaponDamage(weapon, accepted, { critical }));
  }

  async function finish() {
    if (!weapon) return;
    let updated = character;
    const patch: PatchEntry[] = [];

    const usedBonusEntries = hitBonusPreview
      ? [...hitBonusPreview.prompt, ...hitBonusPreview.manual].filter((e) => acceptedBonusIds.has(e.id))
      : [];
    for (const entry of usedBonusEntries) {
      const result = consumeEntryUse(updated, entry.id);
      updated = result.character;
      patch.push(...result.patch);
    }

    const summary =
      hit === false
        ? `Attacked with ${weapon.name}: missed (roll ${rollResult?.trace.finalValue ?? naturalRoll})`
        : `Attacked with ${weapon.name}: hit for ${damageResult?.grandTotal ?? 0} damage (${Object.entries(damageResult?.totalsByType ?? {})
            .map(([type, total]) => `${total} ${type}`)
            .join(", ")})`;

    const transaction = buildTransaction({
      characterId: character.id,
      type: "attack",
      summary,
      trace: rollResult?.trace,
      patch,
    });

    await applyUpdate(updated, transaction);
    onClose();
  }

  return (
    <Sheet title="Attack" onClose={onClose}>
      {phase === "source" && (
        <>
          <p className="hint">Choose what you're attacking with.</p>
          <div className="stack">
            {weapons.map((w) => (
              <button
                key={w.id}
                className="button button-block"
                style={{ justifyContent: "flex-start" }}
                onClick={() => {
                  setWeaponId(w.id);
                  setPhase("roll");
                }}
              >
                {w.name}
                {!w.equipped && w.id !== "__unarmed__" ? " (unequipped)" : ""}
              </button>
            ))}
            {character.weapons.length === 0 && <p className="hint">No weapons yet — add one from Inventory, or fight unarmed.</p>}
          </div>
        </>
      )}

      {phase === "roll" && weapon && (
        <>
          <p className="hint">Attacking with {weapon.name}</p>
          <div className="field">
            <label>Roll mode</label>
            <select value={rollMode} onChange={(e) => setRollMode(e.target.value as RollMode)}>
              <option value="normal">Normal</option>
              <option value="keepHighestOfTwo">Advantage (keep highest of two)</option>
              <option value="keepLowestOfTwo">Disadvantage (keep lowest of two)</option>
            </select>
          </div>
          <div className="row">
            <button className="button" onClick={rollDigitally}>
              Roll for me
            </button>
            <input
              type="number"
              style={{ maxWidth: 120 }}
              placeholder="Manual d20"
              value={naturalRoll ?? ""}
              onChange={(e) => setNaturalRoll(e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <button className="button button-primary button-block" disabled={naturalRoll === null} onClick={() => setPhase("result")}>
            Continue
          </button>
        </>
      )}

      {phase === "result" && rollPreview && rollResult && (
        <>
          <ModifierChecklist matched={rollPreview.matched} acceptedIds={acceptedRollIds} onToggle={toggleRollEntry} />
          <TraceView trace={rollResult.trace} />
          <p>
            <strong>Total Attack Roll: {rollResult.trace.finalValue}</strong>
          </p>
          <p className="hint">Did it hit?</p>
          <div className="row">
            <button
              className="button button-danger"
              onClick={() => {
                setHit(false);
                void finish();
              }}
            >
              Miss
            </button>
            <button
              className="button button-primary"
              onClick={() => {
                setHit(true);
                setPhase("damage");
              }}
            >
              Hit
            </button>
          </div>
        </>
      )}

      {phase === "damage" && weapon && hitBonusPreview && (
        <>
          <label className="toggle-row">
            <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
            Critical hit (double dice)
          </label>
          <ModifierChecklist
            matched={{ auto: [], prompt: hitBonusPreview.prompt, manual: hitBonusPreview.manual }}
            acceptedIds={acceptedBonusIds}
            onToggle={toggleBonusEntry}
          />
          {!damageResult ? (
            <button className="button button-primary button-block" onClick={rollDamage}>
              Roll Damage
            </button>
          ) : (
            <>
              <div className="trace">
                {damageResult.components.map((c, i) => (
                  <div className="trace-step" key={i}>
                    <span>
                      {c.label} ({c.formula})
                    </span>
                    <span>
                      {c.total} {c.damageType}
                    </span>
                  </div>
                ))}
                {Object.entries(damageResult.totalsByType).map(([type, total]) => (
                  <div className="trace-step" key={type}>
                    <span>Total {type}</span>
                    <span>{total}</span>
                  </div>
                ))}
              </div>
              <button className="button button-primary button-block" onClick={finish}>
                Confirm
              </button>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
