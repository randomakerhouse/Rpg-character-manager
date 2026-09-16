import type { Character } from "../model/character.js";
import type { Ruleset } from "../model/ruleset.js";
import type { EventContext } from "../events/context.js";
import { CORE_EVENTS } from "../events/catalog.js";
import { findMatchingModifiers, type MatchedModifiers, type TriggerableEntry } from "../modifiers/matcher.js";
import { runPipeline, type PipelineResult } from "../modifiers/pipeline.js";
import { applySideEffects } from "./sideEffects.js";
import { buildTransaction, type PatchEntry } from "./transactions.js";
import type { CalculationTrace, ManualOverride, Transaction } from "../model/transaction.js";

export interface TakeDamagePreview {
  matched: MatchedModifiers;
  context: EventContext;
}

/** Step 1: finds every AUTO/PROMPT/MANUAL modifier relevant to this incoming damage (section 4/26). */
export function previewTakeDamage(character: Character, amount: number, damageType: string): TakeDamagePreview {
  const context: EventContext = { damage: { amount, type: damageType } };
  const matched = findMatchingModifiers(character, CORE_EVENTS.beforeDamageReceived, context);
  return { matched, context };
}

/** Step 2: runs the pipeline over AUTO effects plus whichever PROMPT/MANUAL ones the player accepted. */
export function calculateTakeDamage(
  amount: number,
  context: EventContext,
  acceptedEntries: TriggerableEntry[],
  ruleset: Ruleset,
): PipelineResult {
  return runPipeline({
    baseValue: amount,
    baseLabel: "Incoming Damage",
    context,
    entries: acceptedEntries,
    pipelineStages: ruleset.pipelineStages,
  });
}

/**
 * Step 3: applies the final (possibly manually overridden) damage to the character —
 * temporary HP absorbs first, then HP — and returns the updated character plus a
 * fully-traced Transaction for the History log / Undo (sections 14, 27, 47).
 */
export function applyTakeDamage(input: {
  character: Character;
  finalDamage: number;
  trace: CalculationTrace;
  sideEffects?: PipelineResult["sideEffects"];
  ruleset: Ruleset;
  context: EventContext;
  manualOverride?: ManualOverride;
}): { character: Character; transaction: Transaction } {
  const { character, finalDamage, trace, ruleset, context, manualOverride } = input;
  const damage = Math.max(0, Math.round(finalDamage));

  const tempHpStat = character.stats.temporaryHp;
  const hpStat = character.stats.hp;
  const patch: PatchEntry[] = [];

  let remaining = damage;
  let nextTempHp = tempHpStat?.current ?? 0;
  if (tempHpStat && remaining > 0) {
    const before = tempHpStat.current;
    const absorbed = Math.min(before, remaining);
    nextTempHp = before - absorbed;
    remaining -= absorbed;
    if (absorbed > 0) patch.push({ path: "stats.temporaryHp.current", before, after: nextTempHp });
  }

  let nextHpCurrent = hpStat?.current ?? 0;
  if (hpStat && remaining > 0) {
    const before = hpStat.current;
    nextHpCurrent = Math.max(0, before - remaining);
    patch.push({ path: "stats.hp.current", before, after: nextHpCurrent });
  }

  let nextCharacter: Character = {
    ...character,
    stats: {
      ...character.stats,
      ...(tempHpStat ? { temporaryHp: { ...tempHpStat, current: nextTempHp } } : {}),
      ...(hpStat ? { hp: { ...hpStat, current: nextHpCurrent } } : {}),
    },
  };

  if (input.sideEffects && input.sideEffects.length > 0) {
    const applied = applySideEffects(nextCharacter, ruleset, input.sideEffects, context);
    nextCharacter = applied.character;
    patch.push(...applied.patch);
  }

  const damageType = String(context.damage && typeof context.damage === "object" ? (context.damage as Record<string, unknown>).type : "");
  const transaction = buildTransaction({
    characterId: character.id,
    type: "take_damage",
    summary: `Received ${damage} ${damageType} damage`,
    trace,
    manualOverride,
    patch,
  });

  return { character: nextCharacter, transaction };
}
