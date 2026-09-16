import type { Character } from "../model/character.js";
import type { ConditionNode } from "../model/condition.js";
import type { Effect } from "../model/effect.js";
import type { ActivationMode, ModifierUses } from "../model/modifier.js";
import type { EventContext } from "../events/context.js";
import { evaluateCondition } from "./conditionEvaluator.js";

/** A normalized, triggerable unit of behavior — a Modifier or a trigger-bearing Ability, unified. */
export interface TriggerableEntry {
  id: string;
  name: string;
  description?: string;
  sourceLabel: string;
  trigger: string;
  conditions: ConditionNode | null;
  effects: Effect[];
  activationMode: ActivationMode;
  priority: number;
  enabled: boolean;
  uses?: ModifierUses;
}

export interface MatchedModifiers {
  auto: TriggerableEntry[];
  prompt: TriggerableEntry[];
  manual: TriggerableEntry[];
}

function hasUsesRemaining(uses: ModifierUses | undefined): boolean {
  return uses === undefined || uses.remaining > 0;
}

/** Gathers every modifier/ability currently "active" on the character — equipped items, intrinsic traits, active conditions. */
export function collectTriggerableEntries(character: Character): TriggerableEntry[] {
  const entries: TriggerableEntry[] = [];

  for (const modifier of character.intrinsicModifiers) {
    if (!modifier.enabled) continue;
    entries.push({
      id: modifier.id,
      name: modifier.name,
      description: modifier.description,
      sourceLabel: "Intrinsic",
      trigger: modifier.trigger,
      conditions: modifier.conditions,
      effects: modifier.effects,
      activationMode: modifier.activationMode,
      priority: modifier.priority,
      enabled: modifier.enabled,
      uses: modifier.uses,
    });
  }

  for (const weapon of character.weapons) {
    if (!weapon.equipped) continue;
    for (const modifier of weapon.modifiers) {
      if (!modifier.enabled) continue;
      entries.push({
        id: modifier.id,
        name: modifier.name,
        description: modifier.description,
        sourceLabel: weapon.name,
        trigger: modifier.trigger,
        conditions: modifier.conditions,
        effects: modifier.effects,
        activationMode: modifier.activationMode,
        priority: modifier.priority,
        enabled: modifier.enabled,
        uses: modifier.uses,
      });
    }
  }

  for (const item of character.items) {
    if (!item.equipped) continue;
    for (const modifier of item.modifiers) {
      if (!modifier.enabled) continue;
      entries.push({
        id: modifier.id,
        name: modifier.name,
        description: modifier.description,
        sourceLabel: item.name,
        trigger: modifier.trigger,
        conditions: modifier.conditions,
        effects: modifier.effects,
        activationMode: modifier.activationMode,
        priority: modifier.priority,
        enabled: modifier.enabled,
        uses: modifier.uses,
      });
    }
  }

  for (const active of character.activeConditions) {
    for (const modifier of active.modifiers) {
      if (!modifier.enabled) continue;
      entries.push({
        id: modifier.id,
        name: modifier.name,
        description: modifier.description,
        sourceLabel: active.conditionDefId,
        trigger: modifier.trigger,
        conditions: modifier.conditions,
        effects: modifier.effects,
        activationMode: modifier.activationMode,
        priority: modifier.priority,
        enabled: modifier.enabled,
        uses: modifier.uses,
      });
    }
  }

  for (const ability of character.abilities) {
    if (!ability.trigger) continue;
    entries.push({
      id: ability.id,
      name: ability.name,
      description: ability.description,
      sourceLabel: "Ability",
      trigger: ability.trigger,
      conditions: ability.conditions ?? null,
      effects: ability.effects ?? [],
      activationMode: ability.activationMode,
      priority: 0,
      enabled: true,
      uses: ability.uses,
    });
  }

  return entries;
}

/** Finds every entry relevant to `trigger` given the current context, bucketed by activation mode. */
export function findMatchingModifiers(
  character: Character,
  trigger: string,
  context: EventContext,
): MatchedModifiers {
  const result: MatchedModifiers = { auto: [], prompt: [], manual: [] };

  for (const entry of collectTriggerableEntries(character)) {
    if (entry.trigger !== trigger) continue;
    if (!entry.enabled) continue;
    if (!hasUsesRemaining(entry.uses)) continue;
    if (!evaluateCondition(entry.conditions, context)) continue;

    result[
      entry.activationMode === "AUTO" ? "auto" : entry.activationMode === "PROMPT" ? "prompt" : "manual"
    ].push(entry);
  }

  const byPriority = (a: TriggerableEntry, b: TriggerableEntry) => a.priority - b.priority;
  result.auto.sort(byPriority);
  result.prompt.sort(byPriority);
  result.manual.sort(byPriority);

  return result;
}
