import { describe, expect, it } from "vitest";
import { evaluateFormula, FormulaParseError, FormulaEvalError, parseFormula } from "../src/formula/index.js";

describe("parseFormula / evaluateFormula", () => {
  it("evaluates a plain number", () => {
    expect(evaluateFormula(parseFormula("42"), () => 0)).toBe(42);
  });

  it("evaluates arithmetic with correct precedence", () => {
    expect(evaluateFormula(parseFormula("2 + 3 * 4"), () => 0)).toBe(14);
    expect(evaluateFormula(parseFormula("(2 + 3) * 4"), () => 0)).toBe(20);
  });

  it("resolves identifiers via the provided resolver", () => {
    const result = evaluateFormula(parseFormula("stats.dexterity.current"), (path) =>
      path === "stats.dexterity.current" ? 16 : 0,
    );
    expect(result).toBe(16);
  });

  it("computes the classic D&D ability modifier formula", () => {
    // floor((score - 10) / 2)
    const node = parseFormula("floor((stats.dexterity.current - 10) / 2)");
    expect(evaluateFormula(node, () => 16)).toBe(3);
    expect(evaluateFormula(node, () => 15)).toBe(2);
    expect(evaluateFormula(node, () => 8)).toBe(-1);
  });

  it("computes an AC-style formula combining a base and a modifier", () => {
    const node = parseFormula("10 + dexMod + armorBonus");
    const resolver = (path: string) => ({ dexMod: 3, armorBonus: 2 })[path] ?? 0;
    expect(evaluateFormula(node, resolver)).toBe(15);
  });

  it("rejects unknown functions", () => {
    expect(() => evaluateFormula(parseFormula("eval(1)"), () => 0)).toThrow(FormulaEvalError);
  });

  it("rejects malformed syntax", () => {
    expect(() => parseFormula("2 + * 3")).toThrow(FormulaParseError);
  });

  it("rejects an empty formula", () => {
    expect(() => parseFormula("")).toThrow(FormulaParseError);
  });
});
