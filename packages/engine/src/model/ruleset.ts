import { z } from "zod";
import type { Id } from "./common.js";
import { PIPELINE_STAGES, type PipelineStage } from "./effect.js";
import { type Modifier, modifierSchema } from "./modifier.js";

export const STAT_VALUE_TYPES = ["simple", "currentMax", "calculated", "counter"] as const;
export type StatValueType = (typeof STAT_VALUE_TYPES)[number];

export interface StatDefinition {
  id: Id;
  name: string;
  valueType: StatValueType;
  /** For "calculated" stats: a dice/value formula referencing other stat ids, e.g. "10 + stats.dexterity.modifier". Resolved by the formula evaluator, never eval'd. */
  formula?: string;
  min?: number;
  max?: number;
  /** e.g. "derived modifier = floor((score - 10) / 2)" style helper stats attach here. */
  derivesModifier?: boolean;
  defaultValue?: number;
}

export interface DamageTypeDefinition {
  id: Id;
  name: string;
  color?: string;
}

export interface ResourceDefinition {
  id: Id;
  name: string;
  max: number | "derived";
  rechargeOn?: "shortRest" | "longRest" | "turnStart" | "turnEnd";
}

export interface ConditionDefinition {
  id: Id;
  name: string;
  description?: string;
  defaultDuration?: { kind: "rounds" | "turns"; amount: number };
  /** Modifier templates automatically attached to any ActiveCondition instantiated from this definition. */
  modifiers: Modifier[];
}

export interface ItemCategoryDefinition {
  id: Id;
  name: string;
}

export interface RollConfig {
  /** e.g. { kind: "keepHighest", ofDice: 2 } to model D&D advantage generically. */
  defaultRollMode: "normal" | "keepHighestOfTwo" | "keepLowestOfTwo";
  criticalRule?: { onNatural: number; effect: "doubleDice" | "maxDice" };
}

export interface Ruleset {
  id: Id;
  name: string;
  schemaVersion: number;
  statDefinitions: StatDefinition[];
  damageTypes: DamageTypeDefinition[];
  resourceDefinitions: ResourceDefinition[];
  conditionDefinitions: ConditionDefinition[];
  itemCategories: ItemCategoryDefinition[];
  /** Ordered pipeline stage list used by the modifier engine for this ruleset. */
  pipelineStages: PipelineStage[];
  rollConfig: RollConfig;
  /** Stamped on every save; used for last-write-wins cloud sync (a missing value sorts as oldest). */
  updatedAt?: string;
}

export const rulesetSchema: z.ZodType<Ruleset> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  updatedAt: z.string().optional(),
  statDefinitions: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      valueType: z.enum(STAT_VALUE_TYPES),
      formula: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      derivesModifier: z.boolean().optional(),
      defaultValue: z.number().optional(),
    }),
  ),
  damageTypes: z.array(
    z.object({ id: z.string().min(1), name: z.string().min(1), color: z.string().optional() }),
  ),
  resourceDefinitions: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      max: z.union([z.number(), z.literal("derived")]),
      rechargeOn: z.enum(["shortRest", "longRest", "turnStart", "turnEnd"]).optional(),
    }),
  ),
  conditionDefinitions: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      defaultDuration: z
        .object({ kind: z.enum(["rounds", "turns"]), amount: z.number().int().positive() })
        .optional(),
      modifiers: z.array(modifierSchema),
    }),
  ),
  itemCategories: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })),
  pipelineStages: z.array(z.enum(PIPELINE_STAGES)),
  rollConfig: z.object({
    defaultRollMode: z.enum(["normal", "keepHighestOfTwo", "keepLowestOfTwo"]),
    criticalRule: z
      .object({
        onNatural: z.number().int(),
        effect: z.enum(["doubleDice", "maxDice"]),
      })
      .optional(),
  }),
});
