import { ALLOWED_FUNCTIONS, FormulaEvalError, type FormulaNode } from "./types.js";

export type IdentifierResolver = (path: string) => number;

export function evaluateFormula(node: FormulaNode, resolveIdentifier: IdentifierResolver): number {
  switch (node.kind) {
    case "number":
      return node.value;
    case "identifier":
      return resolveIdentifier(node.path);
    case "unary":
      return -evaluateFormula(node.operand, resolveIdentifier);
    case "binary": {
      const left = evaluateFormula(node.left, resolveIdentifier);
      const right = evaluateFormula(node.right, resolveIdentifier);
      switch (node.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
      }
      break;
    }
    case "call": {
      const fn = ALLOWED_FUNCTIONS[node.name];
      if (!fn) {
        throw new FormulaEvalError(`Unknown function "${node.name}". Allowed: ${Object.keys(ALLOWED_FUNCTIONS).join(", ")}.`);
      }
      return fn(...node.args.map((arg) => evaluateFormula(arg, resolveIdentifier)));
    }
  }
}
