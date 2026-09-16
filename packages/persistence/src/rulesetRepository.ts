import type { Ruleset, RulesetRepository } from "@rpg/engine";
import { getDb, type RpgDatabase } from "./db.js";

export class DexieRulesetRepository implements RulesetRepository {
  private readonly db: RpgDatabase;

  constructor(db: RpgDatabase = getDb()) {
    this.db = db;
  }

  list(): Promise<Ruleset[]> {
    return this.db.rulesets.toArray();
  }

  get(id: string): Promise<Ruleset | undefined> {
    return this.db.rulesets.get(id);
  }

  async save(ruleset: Ruleset): Promise<void> {
    await this.db.rulesets.put({ ...ruleset, updatedAt: new Date().toISOString() });
  }

  /** Writes a ruleset as-is, preserving its `updatedAt` — used by cloud sync when pulling a remote record down. */
  async importRaw(ruleset: Ruleset): Promise<void> {
    await this.db.rulesets.put(ruleset);
  }

  async delete(id: string): Promise<void> {
    await this.db.rulesets.delete(id);
  }
}
