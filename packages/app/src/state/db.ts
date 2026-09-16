import { DexieCharacterRepository, DexieRulesetRepository, DexieTransactionRepository } from "@rpg/persistence";

export const characterRepository = new DexieCharacterRepository();
export const rulesetRepository = new DexieRulesetRepository();
export const transactionRepository = new DexieTransactionRepository();
