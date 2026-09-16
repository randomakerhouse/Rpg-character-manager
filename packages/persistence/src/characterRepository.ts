import type { Character, CharacterRepository } from "@rpg/engine";
import { getDb, type RpgDatabase } from "./db.js";

export class DexieCharacterRepository implements CharacterRepository {
  private readonly db: RpgDatabase;

  constructor(db: RpgDatabase = getDb()) {
    this.db = db;
  }

  list(): Promise<Character[]> {
    return this.db.characters.toArray();
  }

  get(id: string): Promise<Character | undefined> {
    return this.db.characters.get(id);
  }

  async save(character: Character): Promise<void> {
    await this.db.characters.put({ ...character, updatedAt: new Date().toISOString() });
  }

  /** Writes a character as-is, preserving its `updatedAt` — used by cloud sync when pulling a remote record down. */
  async importRaw(character: Character): Promise<void> {
    await this.db.characters.put(character);
  }

  async delete(id: string): Promise<void> {
    await this.db.characters.delete(id);
  }
}
