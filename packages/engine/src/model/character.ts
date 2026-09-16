import { z } from "zod";
import type { Id } from "./common.js";
import { type Modifier, type ActivationMode, ACTIVATION_MODES, modifierSchema } from "./modifier.js";
import { type ConditionNode, conditionNodeSchema } from "./condition.js";
import { type Effect, effectSchema } from "./effect.js";
import type { DurationExpr } from "./common.js";

export interface CharacterStat {
  statDefId: Id;
  /** For simple/counter stats, or the current value of a currentMax stat. */
  current: number;
  /** Only present for currentMax-typed stats. */
  max?: number;
  /** User-entered base value before modifiers are applied (calculated stats read this as an input). */
  base: number;
  /** Manual override: if set, bypasses computedValue entirely until cleared. */
  manualOverride?: { value: number; reason: string };
}

export interface ResourceState {
  resourceDefId: Id;
  current: number;
  max: number;
}

export interface DamageComponent {
  dice: string;
  damageType: Id;
  bonus?: number;
}

export interface Weapon {
  id: Id;
  name: string;
  description?: string;
  damageComponents: DamageComponent[];
  attackStatId?: Id;
  attackBonus?: number;
  damageBonus?: number;
  range?: string;
  tags: string[];
  charges?: { max: number; remaining: number };
  equipped: boolean;
  modifiers: Modifier[];
}

export interface InventoryItem {
  id: Id;
  name: string;
  description?: string;
  categoryId: Id;
  quantity: number;
  weight?: number;
  equipped: boolean;
  charges?: { max: number; remaining: number };
  tags: string[];
  modifiers: Modifier[];
}

export interface Ability {
  id: Id;
  name: string;
  description?: string;
  trigger?: string;
  conditions?: ConditionNode | null;
  effects?: Effect[];
  activationMode: ActivationMode;
  uses?: { max: number; remaining: number; recharge?: "shortRest" | "longRest" | "turnStart" | "turnEnd" | "never" };
  duration?: DurationExpr;
  cost?: number;
  resourceConsumedId?: Id;
  tags: string[];
}

export interface SpellDamage {
  dice: string;
  damageType: Id;
}

export interface Spell {
  id: Id;
  name: string;
  level: number;
  school?: string;
  description?: string;
  castingTime?: string;
  range?: string;
  duration?: string;
  concentration: boolean;
  components?: string;
  spellAttack: boolean;
  savingThrow?: { statId: Id };
  damage?: SpellDamage[];
  healing?: string;
  statusEffects?: Id[];
  resourceConsumedId?: Id;
  effects?: Effect[];
  activationMode: ActivationMode;
}

export interface ActiveCondition {
  id: Id;
  conditionDefId: Id;
  remaining?: { kind: "rounds" | "turns"; amount: number };
  modifiers: Modifier[];
}

export interface Character {
  id: Id;
  rulesetId: Id;
  name: string;
  level: number;
  imageUrl?: string;
  notes?: string;
  schemaVersion: number;
  stats: Record<Id, CharacterStat>;
  resources: Record<Id, ResourceState>;
  weapons: Weapon[];
  items: InventoryItem[];
  abilities: Ability[];
  spells: Spell[];
  activeConditions: ActiveCondition[];
  /** Modifiers baked into the character itself (racial traits, class features not tied to an item). */
  intrinsicModifiers: Modifier[];
  createdAt: string;
  updatedAt: string;
}

const chargesSchema = z.object({ max: z.number().int().nonnegative(), remaining: z.number().int().nonnegative() });
const usesSchema = z.object({
  max: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  recharge: z.enum(["shortRest", "longRest", "turnStart", "turnEnd", "never"]).optional(),
});
const durationExprSchema: z.ZodType<DurationExpr> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("permanent") }),
  z.object({ kind: z.literal("rounds"), amount: z.number().int().positive() }),
  z.object({ kind: z.literal("turns"), amount: z.number().int().positive() }),
  z.object({ kind: z.literal("untilEvent"), event: z.string().min(1) }),
]);

const characterStatSchema: z.ZodType<CharacterStat> = z.object({
  statDefId: z.string().min(1),
  current: z.number(),
  max: z.number().optional(),
  base: z.number(),
  manualOverride: z.object({ value: z.number(), reason: z.string() }).optional(),
});

const resourceStateSchema: z.ZodType<ResourceState> = z.object({
  resourceDefId: z.string().min(1),
  current: z.number(),
  max: z.number(),
});

const damageComponentSchema: z.ZodType<DamageComponent> = z.object({
  dice: z.string().min(1),
  damageType: z.string().min(1),
  bonus: z.number().optional(),
});

const weaponSchema: z.ZodType<Weapon> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  damageComponents: z.array(damageComponentSchema),
  attackStatId: z.string().optional(),
  attackBonus: z.number().optional(),
  damageBonus: z.number().optional(),
  range: z.string().optional(),
  tags: z.array(z.string()),
  charges: chargesSchema.optional(),
  equipped: z.boolean(),
  modifiers: z.array(modifierSchema),
});

const inventoryItemSchema: z.ZodType<InventoryItem> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1),
  quantity: z.number().int(),
  weight: z.number().optional(),
  equipped: z.boolean(),
  charges: chargesSchema.optional(),
  tags: z.array(z.string()),
  modifiers: z.array(modifierSchema),
});

const abilitySchema: z.ZodType<Ability> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.string().optional(),
  conditions: conditionNodeSchema.nullable().optional(),
  effects: z.array(effectSchema).optional(),
  activationMode: z.enum(ACTIVATION_MODES),
  uses: usesSchema.optional(),
  duration: durationExprSchema.optional(),
  cost: z.number().optional(),
  resourceConsumedId: z.string().optional(),
  tags: z.array(z.string()),
});

const spellSchema: z.ZodType<Spell> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.number().int().nonnegative(),
  school: z.string().optional(),
  description: z.string().optional(),
  castingTime: z.string().optional(),
  range: z.string().optional(),
  duration: z.string().optional(),
  concentration: z.boolean(),
  components: z.string().optional(),
  spellAttack: z.boolean(),
  savingThrow: z.object({ statId: z.string() }).optional(),
  damage: z.array(z.object({ dice: z.string().min(1), damageType: z.string().min(1) })).optional(),
  healing: z.string().optional(),
  statusEffects: z.array(z.string()).optional(),
  resourceConsumedId: z.string().optional(),
  effects: z.array(effectSchema).optional(),
  activationMode: z.enum(ACTIVATION_MODES),
});

const activeConditionSchema: z.ZodType<ActiveCondition> = z.object({
  id: z.string().min(1),
  conditionDefId: z.string().min(1),
  remaining: z.object({ kind: z.enum(["rounds", "turns"]), amount: z.number().int() }).optional(),
  modifiers: z.array(modifierSchema),
});

export const characterSchema: z.ZodType<Character> = z.object({
  id: z.string().min(1),
  rulesetId: z.string().min(1),
  name: z.string().min(1),
  level: z.number().int().positive(),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
  schemaVersion: z.number().int().positive(),
  stats: z.record(characterStatSchema),
  resources: z.record(resourceStateSchema),
  weapons: z.array(weaponSchema),
  items: z.array(inventoryItemSchema),
  abilities: z.array(abilitySchema),
  spells: z.array(spellSchema),
  activeConditions: z.array(activeConditionSchema),
  intrinsicModifiers: z.array(modifierSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
