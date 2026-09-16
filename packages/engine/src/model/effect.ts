import { z } from "zod";
import type { DurationExpr, ValueExpr } from "./common.js";

/**
 * Stage in the modifier pipeline this effect belongs to. Order of stages is
 * ruleset data (see Ruleset.pipelineStages), not hardcoded, so different game
 * systems can reorder how additive/multiplicative/resistance effects combine.
 */
export const PIPELINE_STAGES = [
  "base",
  "additive",
  "multiplicative",
  "resistance",
  "flatReduction",
  "clamp",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** A dotted path into the current EventContext/working value, e.g. "damage.amount". */
export type FieldRef = string;

export type Effect =
  | { op: "add" | "subtract" | "multiply" | "divide" | "set" | "min" | "max"; stage: PipelineStage; target: FieldRef; value: ValueExpr }
  | { op: "addDice"; stage: PipelineStage; target: FieldRef; dice: string; damageType?: string }
  | { op: "grantResistance" | "grantVulnerability" | "grantImmunity"; stage: PipelineStage; damageType: string }
  | { op: "applyCondition"; conditionId: string; duration?: DurationExpr }
  | { op: "removeCondition"; conditionId: string }
  | { op: "consumeResource"; resourceId: string; amount: ValueExpr }
  | { op: "modifyStat"; statId: string; delta: ValueExpr; temporary?: DurationExpr };

const valueExprSchema: z.ZodType<ValueExpr> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("literal"), value: z.number() }),
  z.object({ kind: z.literal("dice"), formula: z.string().min(1) }),
  z.object({ kind: z.literal("fieldRef"), field: z.string().min(1) }),
]);

const durationExprSchema: z.ZodType<DurationExpr> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("permanent") }),
  z.object({ kind: z.literal("rounds"), amount: z.number().int().positive() }),
  z.object({ kind: z.literal("turns"), amount: z.number().int().positive() }),
  z.object({ kind: z.literal("untilEvent"), event: z.string().min(1) }),
]);

export const effectSchema: z.ZodType<Effect> = z.discriminatedUnion("op", [
  z.object({
    op: z.enum(["add", "subtract", "multiply", "divide", "set", "min", "max"]),
    stage: z.enum(PIPELINE_STAGES),
    target: z.string().min(1),
    value: valueExprSchema,
  }),
  z.object({
    op: z.literal("addDice"),
    stage: z.enum(PIPELINE_STAGES),
    target: z.string().min(1),
    dice: z.string().min(1),
    damageType: z.string().optional(),
  }),
  z.object({
    op: z.enum(["grantResistance", "grantVulnerability", "grantImmunity"]),
    stage: z.enum(PIPELINE_STAGES),
    damageType: z.string().min(1),
  }),
  z.object({
    op: z.literal("applyCondition"),
    conditionId: z.string().min(1),
    duration: durationExprSchema.optional(),
  }),
  z.object({
    op: z.literal("removeCondition"),
    conditionId: z.string().min(1),
  }),
  z.object({
    op: z.literal("consumeResource"),
    resourceId: z.string().min(1),
    amount: valueExprSchema,
  }),
  z.object({
    op: z.literal("modifyStat"),
    statId: z.string().min(1),
    delta: valueExprSchema,
    temporary: durationExprSchema.optional(),
  }),
]);
