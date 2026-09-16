export type FormulaNode =
  | { kind: "number"; value: number }
  | { kind: "identifier"; path: string }
  | { kind: "call"; name: string; args: FormulaNode[] }
  | { kind: "unary"; op: "-"; operand: FormulaNode }
  | { kind: "binary"; op: "+" | "-" | "*" | "/"; left: FormulaNode; right: FormulaNode };

export class FormulaParseError extends Error {
  readonly source: string;

  constructor(message: string, source: string) {
    super(message);
    this.source = source;
    this.name = "FormulaParseError";
  }
}

export class FormulaEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaEvalError";
  }
}

/** Whitelisted function names a "calculated" stat formula may call. No arbitrary code paths. */
export const ALLOWED_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  abs: Math.abs,
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
};
