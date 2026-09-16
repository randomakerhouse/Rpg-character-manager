import type { ConditionNode } from "../model/condition.js";
import type { JsonValue } from "../model/common.js";
import type { EventContext } from "../events/context.js";
import { resolveField } from "../events/context.js";

function toComparable(value: JsonValue | undefined): JsonValue | null {
  return value === undefined ? null : value;
}

function evaluateLeaf(field: string, operator: string, expected: JsonValue, context: EventContext): boolean {
  const actual = resolveField(context, field);

  switch (operator) {
    case "eq":
      return toComparable(actual) === expected;
    case "neq":
      return toComparable(actual) !== expected;
    case "gt":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lt":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "in":
      return Array.isArray(expected) && expected.some((v) => v === toComparable(actual));
    case "notIn":
      return Array.isArray(expected) && !expected.some((v) => v === toComparable(actual));
    case "hasTag":
      return Array.isArray(actual) && actual.includes(expected as JsonValue);
    case "hasStatus":
      return Array.isArray(actual) && actual.includes(expected as JsonValue);
    default:
      return false;
  }
}

/** Evaluates a structured condition tree against an EventContext. Pure, no side effects. */
export function evaluateCondition(node: ConditionNode | null | undefined, context: EventContext): boolean {
  if (!node) return true;

  switch (node.kind) {
    case "leaf":
      return evaluateLeaf(node.field, node.operator, node.value, context);
    case "and":
      return node.children.every((child) => evaluateCondition(child, context));
    case "or":
      return node.children.some((child) => evaluateCondition(child, context));
    case "not":
      return !evaluateCondition(node.child, context);
  }
}
