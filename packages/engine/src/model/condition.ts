import { z } from "zod";
import type { JsonValue } from "./common.js";

export const OPERATORS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "notIn",
  "hasTag",
  "hasStatus",
] as const;
export type Op = (typeof OPERATORS)[number];

/**
 * A structured predicate tree evaluated against an EventContext.
 * Deliberately NOT a string expression — this is the safety boundary that
 * lets user-authored rules be validated, serialized, and edited via UI
 * without ever executing arbitrary code.
 */
export type ConditionNode =
  | { kind: "leaf"; field: string; operator: Op; value: JsonValue }
  | { kind: "and"; children: ConditionNode[] }
  | { kind: "or"; children: ConditionNode[] }
  | { kind: "not"; child: ConditionNode };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

export const conditionNodeSchema: z.ZodType<ConditionNode> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("leaf"),
      field: z.string().min(1),
      operator: z.enum(OPERATORS),
      value: jsonValueSchema,
    }),
    z.object({
      kind: z.literal("and"),
      children: z.array(conditionNodeSchema).min(1),
    }),
    z.object({
      kind: z.literal("or"),
      children: z.array(conditionNodeSchema).min(1),
    }),
    z.object({
      kind: z.literal("not"),
      child: conditionNodeSchema,
    }),
  ]),
);

export function leaf(field: string, operator: Op, value: JsonValue): ConditionNode {
  return { kind: "leaf", field, operator, value };
}

export function and(...children: ConditionNode[]): ConditionNode {
  return { kind: "and", children };
}

export function or(...children: ConditionNode[]): ConditionNode {
  return { kind: "or", children };
}

export function not(child: ConditionNode): ConditionNode {
  return { kind: "not", child };
}
