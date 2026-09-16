import { z } from "zod";
import type { DurationExpr } from "./common.js";
import { type ConditionNode, conditionNodeSchema } from "./condition.js";
import { type Effect, effectSchema } from "./effect.js";
import type { Id } from "./common.js";

/** How a matching modifier is applied when its trigger fires. */
export const ACTIVATION_MODES = ["AUTO", "PROMPT", "MANUAL"] as const;
export type ActivationMode = (typeof ACTIVATION_MODES)[number];

/** What kind of entity a modifier is attached to (drives whether it's currently "active"). */
export type ModifierSourceRef =
  | { kind: "intrinsic" }
  | { kind: "item"; itemId: Id }
  | { kind: "weapon"; weaponId: Id }
  | { kind: "ability"; abilityId: Id }
  | { kind: "spell"; spellId: Id }
  | { kind: "condition"; activeConditionId: Id };

export interface ModifierUses {
  max: number;
  remaining: number;
  recharge?: "shortRest" | "longRest" | "turnStart" | "turnEnd" | "never";
}

export interface Modifier {
  id: Id;
  name: string;
  description?: string;
  /** Auto-generated plain-language sentence, e.g. "When you receive Slashing damage, reduce it by 5." */
  humanReadableSummary: string;
  sourceRef: ModifierSourceRef;
  trigger: string;
  conditions: ConditionNode | null;
  effects: Effect[];
  activationMode: ActivationMode;
  priority: number;
  duration?: DurationExpr;
  uses?: ModifierUses;
  enabled: boolean;
}

const modifierSourceRefSchema: z.ZodType<ModifierSourceRef> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("intrinsic") }),
  z.object({ kind: z.literal("item"), itemId: z.string() }),
  z.object({ kind: z.literal("weapon"), weaponId: z.string() }),
  z.object({ kind: z.literal("ability"), abilityId: z.string() }),
  z.object({ kind: z.literal("spell"), spellId: z.string() }),
  z.object({ kind: z.literal("condition"), activeConditionId: z.string() }),
]);

const durationExprSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("permanent") }),
  z.object({ kind: z.literal("rounds"), amount: z.number().int().positive() }),
  z.object({ kind: z.literal("turns"), amount: z.number().int().positive() }),
  z.object({ kind: z.literal("untilEvent"), event: z.string().min(1) }),
]);

export const modifierSchema: z.ZodType<Modifier> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  humanReadableSummary: z.string(),
  sourceRef: modifierSourceRefSchema,
  trigger: z.string().min(1),
  conditions: conditionNodeSchema.nullable(),
  effects: z.array(effectSchema),
  activationMode: z.enum(ACTIVATION_MODES),
  priority: z.number().int(),
  duration: durationExprSchema.optional(),
  uses: z
    .object({
      max: z.number().int().nonnegative(),
      remaining: z.number().int().nonnegative(),
      recharge: z.enum(["shortRest", "longRest", "turnStart", "turnEnd", "never"]).optional(),
    })
    .optional(),
  enabled: z.boolean(),
});
