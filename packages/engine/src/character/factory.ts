import type { Character, CharacterStat, ResourceState } from "../model/character.js";
import type { Ruleset } from "../model/ruleset.js";
import { generateId } from "../util/id.js";

export interface CreateCharacterInput {
  name: string;
  level?: number;
  ruleset: Ruleset;
  /** Initial values for "simple"/"currentMax"/"counter" stats, keyed by stat id. Unset stats use their default. */
  statValues?: Record<string, { current: number; max?: number }>;
}

/** Builds a new Character from a Ruleset, seeding every declared stat/resource with a sensible default. */
export function createCharacter(input: CreateCharacterInput): Character {
  const { ruleset } = input;
  const now = new Date().toISOString();

  const stats: Record<string, CharacterStat> = {};
  for (const def of ruleset.statDefinitions) {
    if (def.valueType === "calculated") continue;
    const provided = input.statValues?.[def.id];
    const current = provided?.current ?? def.defaultValue ?? 0;
    stats[def.id] = {
      statDefId: def.id,
      current,
      base: current,
      ...(def.valueType === "currentMax" ? { max: provided?.max ?? def.defaultValue ?? current } : {}),
    };
  }

  const resources: Record<string, ResourceState> = {};
  for (const def of ruleset.resourceDefinitions) {
    const max = typeof def.max === "number" ? def.max : 0;
    resources[def.id] = { resourceDefId: def.id, current: max, max };
  }

  return {
    id: generateId(),
    rulesetId: ruleset.id,
    name: input.name,
    level: input.level ?? 1,
    schemaVersion: 1,
    stats,
    resources,
    weapons: [],
    items: [],
    abilities: [],
    spells: [],
    activeConditions: [],
    intrinsicModifiers: [],
    createdAt: now,
    updatedAt: now,
  };
}
