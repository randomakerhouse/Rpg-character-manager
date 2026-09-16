import type { JsonValue } from "../model/common.js";

/**
 * The bag of data built when an event fires. ConditionNode.field / Effect target /
 * ValueExpr.fieldRef all resolve against this via dotted paths (e.g. "damage.type").
 * Plain nested object — never a live class instance — so it stays serializable and
 * safe to snapshot into a Transaction trace.
 */
export type EventContext = Record<string, JsonValue | undefined>;

/** Resolves a dotted path like "damage.type" or "actor.stats.strength.current" against a context. */
export function resolveField(context: EventContext, path: string): JsonValue | undefined {
  const parts = path.split(".");
  let current: JsonValue | undefined = context as unknown as JsonValue;
  for (const part of parts) {
    if (current === null || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, JsonValue>)[part];
  }
  return current;
}

export function setField(context: EventContext, path: string, value: JsonValue): EventContext {
  const parts = path.split(".");
  const rootClone: Record<string, JsonValue> = { ...(context as Record<string, JsonValue>) };
  let cursor: Record<string, JsonValue> = rootClone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const existing = cursor[key];
    const nextObj: Record<string, JsonValue> =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? { ...(existing as Record<string, JsonValue>) }
        : {};
    cursor[key] = nextObj;
    cursor = nextObj;
  }
  cursor[parts[parts.length - 1]!] = value;
  return rootClone as EventContext;
}
