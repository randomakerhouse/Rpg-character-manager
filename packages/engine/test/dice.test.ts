import { describe, expect, it } from "vitest";
import {
  DiceParseError,
  doubleDiceCount,
  evaluateAtMaximum,
  evaluateDiceExpression,
  parseDiceFormula,
  rollWithKeepMode,
} from "../src/dice/index.js";

/** Deterministic RNG: returns a fixed sequence of [0,1) values, cycling if exhausted. */
function sequence(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe("parseDiceFormula", () => {
  it("parses a single dice term", () => {
    const expr = parseDiceFormula("1d20");
    expect(expr.terms).toEqual([{ type: "dice", sign: 1, count: 1, sides: 20, rerollAtOrBelow: undefined }]);
  });

  it("parses multiple terms with signs and a flat modifier", () => {
    const expr = parseDiceFormula("2d6+1d4+5");
    expect(expr.terms).toEqual([
      { type: "dice", sign: 1, count: 2, sides: 6, rerollAtOrBelow: undefined },
      { type: "dice", sign: 1, count: 1, sides: 4, rerollAtOrBelow: undefined },
      { type: "flat", sign: 1, value: 5 },
    ]);
  });

  it("parses negative flat modifiers", () => {
    const expr = parseDiceFormula("3d10-2");
    expect(expr.terms[1]).toEqual({ type: "flat", sign: -1, value: 2 });
  });

  it("parses reroll notation", () => {
    const expr = parseDiceFormula("2d6r1");
    expect(expr.terms[0]).toEqual({ type: "dice", sign: 1, count: 2, sides: 6, rerollAtOrBelow: 1 });
  });

  it("rejects an invalid formula", () => {
    expect(() => parseDiceFormula("banana")).toThrow(DiceParseError);
  });

  it("rejects an empty formula", () => {
    expect(() => parseDiceFormula("   ")).toThrow(DiceParseError);
  });

  it("rejects a zero-sided die", () => {
    expect(() => parseDiceFormula("1d0")).toThrow(DiceParseError);
  });
});

describe("evaluateDiceExpression", () => {
  it("sums dice and flat terms using an injected RNG", () => {
    // rng values map to rollDie results: floor(rng*sides)+1
    // for 2d6: rng 0.5 -> 4, 0.0 -> 1 ; flat +5
    const rng = sequence([0.5, 0.0]);
    const expr = parseDiceFormula("2d6+5");
    const result = evaluateDiceExpression(expr, rng);
    expect(result.total).toBe(4 + 1 + 5);
    expect(result.terms[0]!.rolls?.map((r) => r.result)).toEqual([4, 1]);
  });

  it("applies reroll-at-or-below exactly once per die", () => {
    // First roll of 1 (rng=0) triggers a reroll; the reroll uses the next rng value.
    const rng = sequence([0.0, 0.99]);
    const expr = parseDiceFormula("1d6r1");
    const result = evaluateDiceExpression(expr, rng);
    expect(result.terms[0]!.rolls?.[0]!.initialResult).toBe(1);
    expect(result.terms[0]!.rolls?.[0]!.rerolled).toBe(true);
    expect(result.terms[0]!.rolls?.[0]!.result).toBe(6);
    expect(result.total).toBe(6);
  });

  it("produces a full per-die trace, not just a total", () => {
    const rng = sequence([0.1, 0.9]);
    const expr = parseDiceFormula("2d8");
    const result = evaluateDiceExpression(expr, rng);
    expect(result.terms[0]!.rolls).toHaveLength(2);
  });
});

describe("evaluateAtMaximum", () => {
  it("maximizes every dice term without rolling", () => {
    const expr = parseDiceFormula("2d6+1d4+3");
    const result = evaluateAtMaximum(expr);
    expect(result.total).toBe(12 + 4 + 3);
  });
});

describe("doubleDiceCount", () => {
  it("doubles dice terms but leaves flat modifiers untouched (critical hit rule)", () => {
    const expr = parseDiceFormula("1d8+4");
    const doubled = doubleDiceCount(expr);
    expect(doubled.terms[0]).toMatchObject({ type: "dice", count: 2 });
    expect(doubled.terms[1]).toMatchObject({ type: "flat", value: 4 });
  });
});

describe("rollWithKeepMode", () => {
  it("rolls once under normal mode", () => {
    const rng = sequence([0.5]);
    const result = rollWithKeepMode(20, "normal", rng);
    expect(result.rolls).toHaveLength(1);
    expect(result.kept).toBe(11);
  });

  it("keeps the highest of two rolls (generalized advantage)", () => {
    const rng = sequence([0.1, 0.9]); // -> 3, 19 on d20
    const result = rollWithKeepMode(20, "keepHighestOfTwo", rng);
    expect(result.rolls).toEqual([3, 19]);
    expect(result.kept).toBe(19);
  });

  it("keeps the lowest of two rolls (generalized disadvantage)", () => {
    const rng = sequence([0.1, 0.9]);
    const result = rollWithKeepMode(20, "keepLowestOfTwo", rng);
    expect(result.kept).toBe(3);
  });
});
