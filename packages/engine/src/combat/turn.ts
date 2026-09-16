import type { ActiveCondition, Character } from "../model/character.js";
import { CORE_EVENTS } from "../events/catalog.js";
import { findMatchingModifiers, type MatchedModifiers } from "../modifiers/matcher.js";
import { buildTransaction, type PatchEntry } from "./transactions.js";
import type { Transaction } from "../model/transaction.js";

/** Surfaces turn-start/turn-end modifiers (e.g. "Burning: 1d6 fire damage") as reminders — the
 * player routes anything numeric through the normal Take Damage/Heal confirm flow, keeping the
 * "preview before applying" guarantee even for automatic, recurring effects. */
export function previewTurnStart(character: Character): MatchedModifiers {
  return findMatchingModifiers(character, CORE_EVENTS.turnStarted, {});
}

export function previewTurnEnd(character: Character): MatchedModifiers {
  return findMatchingModifiers(character, CORE_EVENTS.turnEnded, {});
}

/** Decrements every ActiveCondition's remaining duration by one, dropping any that expire. */
export function advanceConditionDurations(character: Character): {
  character: Character;
  expired: ActiveCondition[];
  transaction: Transaction;
} {
  const expired: ActiveCondition[] = [];
  const nextActive: ActiveCondition[] = [];

  for (const active of character.activeConditions) {
    if (!active.remaining) {
      nextActive.push(active);
      continue;
    }
    const amount = active.remaining.amount - 1;
    if (amount <= 0) {
      expired.push(active);
    } else {
      nextActive.push({ ...active, remaining: { ...active.remaining, amount } });
    }
  }

  const patch: PatchEntry[] = [{ path: "activeConditions", before: character.activeConditions, after: nextActive }];
  const transaction = buildTransaction({
    characterId: character.id,
    type: "turn_advance",
    summary:
      expired.length > 0
        ? `Conditions expired: ${expired.map((e) => e.conditionDefId).join(", ")}`
        : "Turn advanced",
    patch,
  });

  return { character: { ...character, activeConditions: nextActive }, expired, transaction };
}

/** Resets uses.remaining to uses.max for every modifier/ability whose recharge matches `when`. */
export function rechargeUses(
  character: Character,
  when: "shortRest" | "longRest" | "turnStart" | "turnEnd",
): Character {
  const rechargeModifier = <T extends { uses?: { max: number; remaining: number; recharge?: string } }>(m: T): T =>
    m.uses?.recharge === when ? ({ ...m, uses: { ...m.uses, remaining: m.uses.max } } as T) : m;

  return {
    ...character,
    intrinsicModifiers: character.intrinsicModifiers.map(rechargeModifier),
    abilities: character.abilities.map(rechargeModifier),
    weapons: character.weapons.map((w) => ({ ...w, modifiers: w.modifiers.map(rechargeModifier) })),
    items: character.items.map((i) => ({ ...i, modifiers: i.modifiers.map(rechargeModifier) })),
  };
}
