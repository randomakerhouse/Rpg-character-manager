import type { Character, Weapon } from "../model/character.js";
import type { Ruleset } from "../model/ruleset.js";
import type { EventContext } from "../events/context.js";
import { CORE_EVENTS } from "../events/catalog.js";
import { findMatchingModifiers, type MatchedModifiers, type TriggerableEntry } from "../modifiers/matcher.js";
import { runPipeline, type PipelineResult } from "../modifiers/pipeline.js";
import { abilityModifier, resolveStat } from "../character/statResolver.js";
import { literal } from "../model/common.js";
import {
  doubleDiceCount,
  evaluateDiceExpression,
  parseDiceFormula,
  rollWithKeepMode,
  type KeptRoll,
  type RandomFn,
  type RollMode,
} from "../dice/index.js";

/** Rolls the d20 for an attack, honoring the ruleset's default roll mode (advantage/disadvantage-style). */
export function rollAttackDie(ruleset: Ruleset, mode?: RollMode, rng?: RandomFn): KeptRoll {
  return rollWithKeepMode(20, mode ?? ruleset.rollConfig.defaultRollMode, rng);
}

/**
 * Synthesizes the "baseline" contributions to an attack roll that the engine already
 * knows (ability modifier, proficiency, the weapon's own bonus) so they appear in the
 * same trace as user-authored modifiers — matching the worked example in section 6.
 */
export function buildBaselineAttackEntries(character: Character, ruleset: Ruleset, weapon: Weapon): TriggerableEntry[] {
  const entries: TriggerableEntry[] = [];

  if (weapon.attackStatId) {
    const stat = ruleset.statDefinitions.find((s) => s.id === weapon.attackStatId);
    const resolved = resolveStat(character, ruleset, weapon.attackStatId);
    const mod = stat?.derivesModifier ? abilityModifier(resolved.value) : resolved.value;
    entries.push({
      id: `baseline-ability-${weapon.attackStatId}`,
      name: stat?.name ?? weapon.attackStatId,
      sourceLabel: "Baseline",
      trigger: CORE_EVENTS.attackRoll,
      conditions: null,
      effects: [{ op: "add", stage: "additive", target: "workingValue", value: literal(mod) }],
      activationMode: "AUTO",
      priority: -20,
      enabled: true,
    });
  }

  if (character.stats.proficiencyBonus) {
    entries.push({
      id: "baseline-proficiency",
      name: "Proficiency Bonus",
      sourceLabel: "Baseline",
      trigger: CORE_EVENTS.attackRoll,
      conditions: null,
      effects: [
        { op: "add", stage: "additive", target: "workingValue", value: literal(character.stats.proficiencyBonus.current) },
      ],
      activationMode: "AUTO",
      priority: -10,
      enabled: true,
    });
  }

  if (weapon.attackBonus) {
    entries.push({
      id: `baseline-weapon-${weapon.id}`,
      name: weapon.name,
      sourceLabel: "Baseline",
      trigger: CORE_EVENTS.attackRoll,
      conditions: null,
      effects: [{ op: "add", stage: "additive", target: "workingValue", value: literal(weapon.attackBonus) }],
      activationMode: "AUTO",
      priority: 0,
      enabled: true,
    });
  }

  return entries;
}

export interface AttackRollPreview {
  matched: MatchedModifiers;
  baseline: TriggerableEntry[];
  context: EventContext;
}

export function previewAttackRoll(character: Character, weapon: Weapon, naturalRoll: number): AttackRollPreview {
  const context: EventContext = {
    attack: { source: "weapon", weaponId: weapon.id, tags: weapon.tags },
    roll: { natural: naturalRoll },
  };
  const matched = findMatchingModifiers(character, CORE_EVENTS.attackRoll, context);
  return { matched, baseline: [], context };
}

export function calculateAttackRoll(
  naturalRoll: number,
  context: EventContext,
  entries: TriggerableEntry[],
  ruleset: Ruleset,
): PipelineResult {
  return runPipeline({
    baseValue: naturalRoll,
    baseLabel: "Dice Roll",
    context,
    entries,
    pipelineStages: ruleset.pipelineStages,
  });
}

/** Finds optional on-hit bonuses like "Electric Fury" the player may choose to activate. */
export function previewWeaponHitBonuses(character: Character, weapon: Weapon): MatchedModifiers {
  const context: EventContext = { weapon: { id: weapon.id, tags: weapon.tags } };
  return findMatchingModifiers(character, CORE_EVENTS.onWeaponHit, context);
}

export interface DamageComponentResult {
  label: string;
  damageType: string;
  formula: string;
  total: number;
}

export interface RolledDamage {
  components: DamageComponentResult[];
  totalsByType: Record<string, number>;
  grandTotal: number;
}

/**
 * Rolls a weapon's own damage dice plus any accepted on-hit bonus dice, keeping totals
 * separated by damage type (section 6/7 — "the target might have different resistances").
 */
export function rollWeaponDamage(
  weapon: Weapon,
  acceptedBonusEntries: TriggerableEntry[],
  options: { critical?: boolean; rng?: RandomFn } = {},
): RolledDamage {
  const components: DamageComponentResult[] = [];

  for (const dc of weapon.damageComponents) {
    let expr = parseDiceFormula(dc.dice);
    if (options.critical) expr = doubleDiceCount(expr);
    const evaluation = evaluateDiceExpression(expr, options.rng);
    const total = evaluation.total + (dc.bonus ?? 0) + (weapon.damageBonus ?? 0);
    components.push({ label: weapon.name, damageType: dc.damageType, formula: dc.dice, total });
  }

  for (const entry of acceptedBonusEntries) {
    for (const effect of entry.effects) {
      if (effect.op !== "addDice") continue;
      let expr = parseDiceFormula(effect.dice);
      if (options.critical) expr = doubleDiceCount(expr);
      const evaluation = evaluateDiceExpression(expr, options.rng);
      components.push({
        label: entry.name,
        damageType: effect.damageType ?? "untyped",
        formula: effect.dice,
        total: evaluation.total,
      });
    }
  }

  const totalsByType: Record<string, number> = {};
  for (const c of components) {
    totalsByType[c.damageType] = (totalsByType[c.damageType] ?? 0) + c.total;
  }

  return { components, totalsByType, grandTotal: components.reduce((sum, c) => sum + c.total, 0) };
}
