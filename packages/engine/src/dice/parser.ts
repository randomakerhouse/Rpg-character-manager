import { DiceParseError, type DiceExpression, type DiceExpressionTerm } from "./types.js";

const TERM_PATTERN = /([+-]?)\s*(?:(\d+)d(\d+)(?:r(\d+))?|(\d+))/gi;

/**
 * Parses formulas like "1d20", "2d6+4", "2d6+1d4+5-3", "2d6r1" (reroll 1s once).
 * Never evaluates code — this only builds a structured AST validated below.
 */
export function parseDiceFormula(source: string): DiceExpression {
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    throw new DiceParseError("Dice formula is empty.", source);
  }

  const normalized = trimmed.replace(/\s+/g, "");
  const matches = [...normalized.matchAll(TERM_PATTERN)];
  const consumed = matches.reduce((sum, m) => sum + m[0].length, 0);
  if (matches.length === 0 || consumed !== normalized.length) {
    throw new DiceParseError(`Could not parse dice formula "${source}".`, source);
  }

  const terms: DiceExpressionTerm[] = matches.map((match) => {
    const [, signRaw, countRaw, sidesRaw, rerollRaw, flatRaw] = match;
    const sign = signRaw === "-" ? -1 : 1;

    if (countRaw !== undefined && sidesRaw !== undefined) {
      const count = Number(countRaw);
      const sides = Number(sidesRaw);
      if (count <= 0 || sides <= 0) {
        throw new DiceParseError(`Dice count and sides must be positive in "${match[0]}".`, source);
      }
      const rerollAtOrBelow = rerollRaw !== undefined ? Number(rerollRaw) : undefined;
      return { type: "dice", sign, count, sides, rerollAtOrBelow };
    }

    return { type: "flat", sign, value: Number(flatRaw) };
  });

  return { source, terms };
}
