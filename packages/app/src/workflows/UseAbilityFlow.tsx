import { useState } from "react";
import type { PatchEntry } from "@rpg/engine";
import { applySideEffects, buildTransaction, consumeEntryUse } from "@rpg/engine";
import Sheet from "../components/Sheet.js";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";

export default function UseAbilityFlow({ onClose }: { onClose: () => void }) {
  const { character, ruleset } = useCharacterContext();
  const applyUpdate = useAppStore((s) => s.applyUpdate);
  const [abilityId, setAbilityId] = useState(character.abilities[0]?.id ?? "");

  const ability = character.abilities.find((a) => a.id === abilityId);

  async function confirm() {
    if (!ability) return;

    let updated = character;
    let patch: PatchEntry[] = [];

    if (ability.uses) {
      const result = consumeEntryUse(updated, ability.id);
      updated = result.character;
      patch = [...patch, ...result.patch];
    }

    if (ability.resourceConsumedId && updated.resources[ability.resourceConsumedId]) {
      const applied = applySideEffects(
        updated,
        ruleset,
        [{ entryId: ability.id, entryName: ability.name, effect: { op: "consumeResource", resourceId: ability.resourceConsumedId, amount: { kind: "literal", value: ability.cost ?? 1 } } }],
        {},
      );
      updated = applied.character;
      patch = [...patch, ...applied.patch];
    }

    if (ability.effects) {
      for (const effect of ability.effects) {
        if (effect.op === "applyCondition" || effect.op === "removeCondition" || effect.op === "modifyStat") {
          const applied = applySideEffects(updated, ruleset, [{ entryId: ability.id, entryName: ability.name, effect }], {});
          updated = applied.character;
          patch = [...patch, ...applied.patch];
        }
      }
    }

    const transaction = buildTransaction({
      characterId: character.id,
      type: "ability_used",
      summary: `Used ability: ${ability.name}`,
      patch,
    });

    await applyUpdate(updated, transaction);
    onClose();
  }

  if (character.abilities.length === 0) {
    return (
      <Sheet title="Use Ability" onClose={onClose}>
        <p className="hint">No abilities yet — add one from the Abilities tab.</p>
      </Sheet>
    );
  }

  return (
    <Sheet title="Use Ability" onClose={onClose}>
      <div className="field">
        <label>Ability</label>
        <select value={abilityId} onChange={(e) => setAbilityId(e.target.value)}>
          {character.abilities.map((a) => (
            <option key={a.id} value={a.id} disabled={a.uses ? a.uses.remaining <= 0 : false}>
              {a.name}
              {a.uses ? ` (${a.uses.remaining}/${a.uses.max})` : ""}
            </option>
          ))}
        </select>
        {ability?.description && <span className="hint">{ability.description}</span>}
      </div>
      <button className="button button-primary button-block" disabled={ability?.uses ? ability.uses.remaining <= 0 : false} onClick={confirm}>
        Use {ability?.name}
      </button>
    </Sheet>
  );
}
