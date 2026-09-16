import type { Character } from "../model/character.js";
import type { Ruleset } from "../model/ruleset.js";
import type { Transaction } from "../model/transaction.js";

/**
 * Storage-agnostic boundary the engine depends on. `persistence` provides the IndexedDB
 * implementation today; a future remote/cloud implementation can satisfy the same
 * interface without the engine or UI changing (keeps the door open for section 28).
 */
export interface CharacterRepository {
  list(): Promise<Character[]>;
  get(id: string): Promise<Character | undefined>;
  save(character: Character): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface RulesetRepository {
  list(): Promise<Ruleset[]>;
  get(id: string): Promise<Ruleset | undefined>;
  save(ruleset: Ruleset): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TransactionRepository {
  listByCharacter(characterId: string): Promise<Transaction[]>;
  append(transaction: Transaction): Promise<void>;
  update(transaction: Transaction): Promise<void>;
}
