import type { Character } from "../model/character.js";
import type { Transaction } from "../model/transaction.js";
import { setPath } from "../util/objectPath.js";
import { generateId } from "../util/id.js";

export type PatchEntry = Transaction["patch"][number];

export function buildTransaction(input: {
  characterId: string;
  type: string;
  summary: string;
  trace?: Transaction["trace"];
  manualOverride?: Transaction["manualOverride"];
  patch: PatchEntry[];
}): Transaction {
  return {
    id: generateId(),
    characterId: input.characterId,
    timestamp: new Date().toISOString(),
    type: input.type,
    summary: input.summary,
    trace: input.trace,
    manualOverride: input.manualOverride,
    patch: input.patch,
    undone: false,
  };
}

export function applyPatch(character: Character, patch: PatchEntry[]): Character {
  return patch.reduce((acc, entry) => setPath(acc, entry.path, entry.after), character);
}

export function revertPatch(character: Character, patch: PatchEntry[]): Character {
  // revert in reverse order in case later entries depended on earlier ones
  return [...patch].reverse().reduce((acc, entry) => setPath(acc, entry.path, entry.before), character);
}

/**
 * Undoes the most recent non-undone transaction for this character (section 47's
 * safety-net undo). Returns null if there is nothing left to undo.
 */
export function undoLastTransaction(
  character: Character,
  transactions: Transaction[],
): { character: Character; transactions: Transaction[] } | null {
  const index = [...transactions].reverse().findIndex((t) => t.characterId === character.id && !t.undone);
  if (index === -1) return null;
  const realIndex = transactions.length - 1 - index;
  const target = transactions[realIndex]!;

  const nextCharacter = revertPatch(character, target.patch);
  const nextTransactions = transactions.map((t, i) => (i === realIndex ? { ...t, undone: true } : t));

  return { character: nextCharacter, transactions: nextTransactions };
}
