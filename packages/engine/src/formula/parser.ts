import { FormulaParseError, type FormulaNode } from "./types.js";

type TokenType = "number" | "identifier" | "lparen" | "rparen" | "comma" | "plus" | "minus" | "star" | "slash" | "eof";

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(source[i + 1] ?? ""))) {
      let j = i + 1;
      while (j < source.length && /[0-9.]/.test(source[j]!)) j++;
      tokens.push({ type: "number", value: source.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < source.length && /[A-Za-z0-9_.]/.test(source[j]!)) j++;
      tokens.push({ type: "identifier", value: source.slice(i, j) });
      i = j;
      continue;
    }
    const single: Record<string, TokenType> = {
      "(": "lparen",
      ")": "rparen",
      ",": "comma",
      "+": "plus",
      "-": "minus",
      "*": "star",
      "/": "slash",
    };
    if (single[ch]) {
      tokens.push({ type: single[ch], value: ch });
      i++;
      continue;
    }
    throw new FormulaParseError(`Unexpected character "${ch}" in formula.`, source);
  }
  tokens.push({ type: "eof", value: "" });
  return tokens;
}

class Parser {
  private pos = 0;
  private readonly tokens: Token[];
  private readonly source: string;

  constructor(tokens: Token[], source: string) {
    this.tokens = tokens;
    this.source = source;
  }

  private peek(): Token {
    return this.tokens[this.pos]!;
  }

  private advance(): Token {
    return this.tokens[this.pos++]!;
  }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new FormulaParseError(`Expected ${type} but found "${token.value || "end of formula"}".`, this.source);
    }
    return this.advance();
  }

  parseProgram(): FormulaNode {
    const node = this.parseExpression();
    this.expect("eof");
    return node;
  }

  parseExpression(): FormulaNode {
    let node = this.parseTerm();
    while (this.peek().type === "plus" || this.peek().type === "minus") {
      const op = this.advance().type === "plus" ? "+" : "-";
      node = { kind: "binary", op, left: node, right: this.parseTerm() };
    }
    return node;
  }

  private parseTerm(): FormulaNode {
    let node = this.parseFactor();
    while (this.peek().type === "star" || this.peek().type === "slash") {
      const op = this.advance().type === "star" ? "*" : "/";
      node = { kind: "binary", op, left: node, right: this.parseFactor() };
    }
    return node;
  }

  private parseFactor(): FormulaNode {
    if (this.peek().type === "minus") {
      this.advance();
      return { kind: "unary", op: "-", operand: this.parseFactor() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): FormulaNode {
    const token = this.peek();

    if (token.type === "number") {
      this.advance();
      return { kind: "number", value: Number(token.value) };
    }

    if (token.type === "lparen") {
      this.advance();
      const node = this.parseExpression();
      this.expect("rparen");
      return node;
    }

    if (token.type === "identifier") {
      this.advance();
      if (this.peek().type === "lparen") {
        this.advance();
        const args: FormulaNode[] = [];
        if (this.peek().type !== "rparen") {
          args.push(this.parseExpression());
          while (this.peek().type === "comma") {
            this.advance();
            args.push(this.parseExpression());
          }
        }
        this.expect("rparen");
        return { kind: "call", name: token.value, args };
      }
      return { kind: "identifier", path: token.value };
    }

    throw new FormulaParseError(`Unexpected token "${token.value || "end of formula"}".`, this.source);
  }
}

/** Parses a small arithmetic formula (e.g. "10 + floor((stats.dexterity.current - 10) / 2)") into an AST. Never eval'd. */
export function parseFormula(source: string): FormulaNode {
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    throw new FormulaParseError("Formula is empty.", source);
  }
  const parser = new Parser(tokenize(trimmed), source);
  return parser.parseProgram();
}
