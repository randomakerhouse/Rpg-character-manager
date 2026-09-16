export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type Id = string;

/** A dice formula string, e.g. "1d8+4", "2d6+1d4+5". Parsed by the dice engine, never eval'd. */
export type DiceFormula = string;

/**
 * A value used inside an Effect. Never arbitrary code — either a literal number,
 * a dice formula to roll, or a reference to an already-resolved field on the
 * current EventContext (e.g. "actor.stats.proficiency.value").
 */
export type ValueExpr =
  | { kind: "literal"; value: number }
  | { kind: "dice"; formula: DiceFormula }
  | { kind: "fieldRef"; field: string };

/** How long an effect/condition/temporary stat change lasts. */
export type DurationExpr =
  | { kind: "permanent" }
  | { kind: "rounds"; amount: number }
  | { kind: "turns"; amount: number }
  | { kind: "untilEvent"; event: string };

export function literal(value: number): ValueExpr {
  return { kind: "literal", value };
}

export function dice(formula: DiceFormula): ValueExpr {
  return { kind: "dice", formula };
}

export function fieldRef(field: string): ValueExpr {
  return { kind: "fieldRef", field };
}
