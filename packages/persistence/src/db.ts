import Dexie, { type Table } from "dexie";
import type { Character, Ruleset, Transaction } from "@rpg/engine";

export class RpgDatabase extends Dexie {
  characters!: Table<Character, string>;
  rulesets!: Table<Ruleset, string>;
  transactions!: Table<Transaction, string>;

  constructor(name = "rpg-character-manager") {
    super(name);
    this.version(1).stores({
      characters: "id, name, rulesetId, updatedAt",
      rulesets: "id, name",
      transactions: "id, characterId, timestamp",
    });
  }
}

let sharedDb: RpgDatabase | undefined;

/** Lazily-created singleton so the whole app shares one IndexedDB connection. */
export function getDb(): RpgDatabase {
  sharedDb ??= new RpgDatabase();
  return sharedDb;
}
