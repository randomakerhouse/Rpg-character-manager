export type Sign = 1 | -1;

export interface DiceTerm {
  type: "dice";
  sign: Sign;
  count: number;
  sides: number;
  /** Reroll a single die once if its result is at or below this value (e.g. "reroll 1s"). */
  rerollAtOrBelow?: number;
}

export interface FlatTerm {
  type: "flat";
  sign: Sign;
  value: number;
}

export type DiceExpressionTerm = DiceTerm | FlatTerm;

export interface DiceExpression {
  source: string;
  terms: DiceExpressionTerm[];
}

export interface DieRoll {
  sides: number;
  initialResult: number;
  result: number;
  rerolled: boolean;
}

export interface DiceTermResult {
  term: DiceExpressionTerm;
  rolls?: DieRoll[];
  subtotal: number;
}

export interface DiceEvaluation {
  source: string;
  total: number;
  terms: DiceTermResult[];
}

export type RollMode = "normal" | "keepHighestOfTwo" | "keepLowestOfTwo";

export interface KeptRoll {
  sides: number;
  mode: RollMode;
  rolls: number[];
  kept: number;
}

/** Returns a float in [0, 1). Injectable so tests are deterministic. */
export type RandomFn = () => number;

export class DiceParseError extends Error {
  readonly source: string;

  constructor(message: string, source: string) {
    super(message);
    this.source = source;
    this.name = "DiceParseError";
  }
}
