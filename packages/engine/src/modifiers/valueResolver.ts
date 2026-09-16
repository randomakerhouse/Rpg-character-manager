import type { ValueExpr } from "../model/common.js";
import type { EventContext } from "../events/context.js";
import { resolveField } from "../events/context.js";
import { evaluateDiceExpression, parseDiceFormula, type RandomFn } from "../dice/index.js";
import { ModifierEngineError } from "./errors.js";

export interface ResolvedValue {
  value: number;
  /** Present when the value came from rolling dice, for the calculation trace. */
  diceBreakdown?: string;
}

/** Resolves a ValueExpr to a concrete number. Never executes arbitrary code. */
export function resolveValueExpr(expr: ValueExpr, context: EventContext, rng?: RandomFn): ResolvedValue {
  switch (expr.kind) {
    case "literal":
      return { value: expr.value };
    case "dice": {
      const evaluation = evaluateDiceExpression(parseDiceFormula(expr.formula), rng);
      return { value: evaluation.total, diceBreakdown: `${expr.formula} = ${evaluation.total}` };
    }
    case "fieldRef": {
      const resolved = resolveField(context, expr.field);
      if (typeof resolved !== "number") {
        throw new ModifierEngineError(`Field "${expr.field}" did not resolve to a number.`);
      }
      return { value: resolved };
    }
  }
}
