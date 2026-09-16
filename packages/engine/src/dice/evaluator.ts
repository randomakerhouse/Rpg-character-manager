import type {
  DiceEvaluation,
  DiceExpression,
  DiceExpressionTerm,
  DiceTermResult,
  DieRoll,
  KeptRoll,
  RandomFn,
  RollMode,
} from "./types.js";

const defaultRandom: RandomFn = Math.random;

export function rollDie(sides: number, rng: RandomFn = defaultRandom): number {
  return Math.floor(rng() * sides) + 1;
}

function evaluateTerm(term: DiceExpressionTerm, rng: RandomFn): DiceTermResult {
  if (term.type === "flat") {
    return { term, subtotal: term.sign * term.value };
  }

  const rolls: DieRoll[] = [];
  for (let i = 0; i < term.count; i++) {
    const initialResult = rollDie(term.sides, rng);
    let result = initialResult;
    let rerolled = false;
    if (term.rerollAtOrBelow !== undefined && initialResult <= term.rerollAtOrBelow) {
      result = rollDie(term.sides, rng);
      rerolled = true;
    }
    rolls.push({ sides: term.sides, initialResult, result, rerolled });
  }

  const sum = rolls.reduce((acc, r) => acc + r.result, 0);
  return { term, rolls, subtotal: term.sign * sum };
}

/** Evaluates a parsed dice expression, producing both the total and a per-die trace. */
export function evaluateDiceExpression(
  expression: DiceExpression,
  rng: RandomFn = defaultRandom,
): DiceEvaluation {
  const terms = expression.terms.map((term) => evaluateTerm(term, rng));
  const total = terms.reduce((sum, t) => sum + t.subtotal, 0);
  return { source: expression.source, total, terms };
}

/** Evaluates as if every die rolled its maximum value (e.g. "maximize damage dice" crit rule). */
export function evaluateAtMaximum(expression: DiceExpression): DiceEvaluation {
  const terms: DiceTermResult[] = expression.terms.map((term) => {
    if (term.type === "flat") {
      return { term, subtotal: term.sign * term.value };
    }
    const rolls: DieRoll[] = Array.from({ length: term.count }, () => ({
      sides: term.sides,
      initialResult: term.sides,
      result: term.sides,
      rerolled: false,
    }));
    return { term, rolls, subtotal: term.sign * term.sides * term.count };
  });
  const total = terms.reduce((sum, t) => sum + t.subtotal, 0);
  return { source: expression.source, total, terms };
}

/** Doubles the dice count of every dice term (not flat modifiers) — a common critical-hit rule. */
export function doubleDiceCount(expression: DiceExpression): DiceExpression {
  return {
    source: expression.source,
    terms: expression.terms.map((term) =>
      term.type === "dice" ? { ...term, count: term.count * 2 } : term,
    ),
  };
}

/**
 * Rolls a single die under a keep mode that generalizes advantage/disadvantage:
 * "keepHighestOfTwo"/"keepLowestOfTwo" roll two dice and keep one; "normal" rolls once.
 */
export function rollWithKeepMode(
  sides: number,
  mode: RollMode,
  rng: RandomFn = defaultRandom,
): KeptRoll {
  if (mode === "normal") {
    const roll = rollDie(sides, rng);
    return { sides, mode, rolls: [roll], kept: roll };
  }

  const rolls = [rollDie(sides, rng), rollDie(sides, rng)];
  const kept = mode === "keepHighestOfTwo" ? Math.max(...rolls) : Math.min(...rolls);
  return { sides, mode, rolls, kept };
}
