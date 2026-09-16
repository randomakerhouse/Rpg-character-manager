import { createContext, useContext } from "react";
import type { Character, Ruleset, Transaction } from "@rpg/engine";

export interface CharacterContextValue {
  character: Character;
  ruleset: Ruleset;
  transactions: Transaction[];
}

export const CharacterContext = createContext<CharacterContextValue | null>(null);

export function useCharacterContext(): CharacterContextValue {
  const ctx = useContext(CharacterContext);
  if (!ctx) throw new Error("useCharacterContext must be used within a CharacterShell.");
  return ctx;
}
