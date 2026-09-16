import type { Transaction, TransactionRepository } from "@rpg/engine";
import { getDb, type RpgDatabase } from "./db.js";

export class DexieTransactionRepository implements TransactionRepository {
  private readonly db: RpgDatabase;

  constructor(db: RpgDatabase = getDb()) {
    this.db = db;
  }

  listByCharacter(characterId: string): Promise<Transaction[]> {
    return this.db.transactions.where("characterId").equals(characterId).sortBy("timestamp");
  }

  async append(transaction: Transaction): Promise<void> {
    await this.db.transactions.put(transaction);
  }

  async update(transaction: Transaction): Promise<void> {
    await this.db.transactions.put(transaction);
  }

  listAll(): Promise<Transaction[]> {
    return this.db.transactions.toArray();
  }
}
