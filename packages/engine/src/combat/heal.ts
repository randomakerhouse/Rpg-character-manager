import type { Character } from "../model/character.js";
import type { Ruleset } from "../model/ruleset.js";
import type { EventContext } from "../events/context.js";
import { CORE_EVENTS } from "../events/catalog.js";
import { findMatchingModifiers, type MatchedModifiers, type TriggerableEntry } from "../modifiers/matcher.js";
import { runPipeline, type PipelineResult } from "../modifiers/pipeline.js";
import { buildTransaction, type PatchEntry } from "./transactions.js";
import type { CalculationTrace, ManualOverride, Transaction } from "../model/transaction.js";

export function previewHeal(character: Character, amount: number): { matched: MatchedModifiers; context: EventContext } {
  const context: EventContext = { healing: { amount } };
  const matched = findMatchingModifiers(character, CORE_EVENTS.healingReceived, context);
  return { matched, context };
}

export function calculateHeal(
  amount: number,
  context: EventContext,
  acceptedEntries: TriggerableEntry[],
  ruleset: Ruleset,
): PipelineResult {
  return runPipeline({
    baseValue: amount,
    baseLabel: "Healing",
    context,
    entries: acceptedEntries,
    pipelineStages: ruleset.pipelineStages,
  });
}

export function applyHeal(input: {
  character: Character;
  finalHealing: number;
  trace: CalculationTrace;
  manualOverride?: ManualOverride;
}): { character: Character; transaction: Transaction } {
  const { character, finalHealing, trace, manualOverride } = input;
  const healing = Math.max(0, Math.round(finalHealing));
  const hpStat = character.stats.hp;
  const patch: PatchEntry[] = [];

  let nextHp = hpStat?.current ?? 0;
  if (hpStat) {
    const before = hpStat.current;
    nextHp = hpStat.max !== undefined ? Math.min(hpStat.max, before + healing) : before + healing;
    patch.push({ path: "stats.hp.current", before, after: nextHp });
  }

  const nextCharacter: Character = {
    ...character,
    stats: hpStat ? { ...character.stats, hp: { ...hpStat, current: nextHp } } : character.stats,
  };

  const transaction = buildTransaction({
    characterId: character.id,
    type: "heal",
    summary: `Healed ${healing}`,
    trace,
    manualOverride,
    patch,
  });

  return { character: nextCharacter, transaction };
}
