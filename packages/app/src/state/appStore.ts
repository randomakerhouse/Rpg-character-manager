import { create } from "zustand";
import type { Character, Ruleset, Transaction } from "@rpg/engine";
import { dnd5eRuleset, undoLastTransaction } from "@rpg/engine";
import {
  FirestoreCharacterRepository,
  FirestoreRulesetRepository,
  FirestoreTransactionRepository,
  deleteCharacterEverywhere,
  isFirebaseConfigured,
  syncAll,
} from "@rpg/persistence";
import { characterRepository, rulesetRepository, transactionRepository } from "./db.js";

export type SyncStatus = "disabled" | "idle" | "syncing" | "synced" | "error";

interface AppState {
  loaded: boolean;
  charactersById: Record<string, Character>;
  characterOrder: string[];
  rulesetsById: Record<string, Ruleset>;
  transactionsByCharacter: Record<string, Transaction[]>;
  selectedCharacterId: string | null;

  cloudUid: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  syncError: string | null;

  init(): Promise<void>;
  selectCharacter(id: string | null): void;
  saveRuleset(ruleset: Ruleset): Promise<void>;
  saveCharacter(character: Character): Promise<void>;
  deleteCharacter(id: string): Promise<void>;
  /** Central write path: every combat/inventory/etc. action produces a new Character and
   * (usually) a Transaction — this persists both and keeps the store's cache in sync so
   * autosave and the History screen never drift from what's on disk. */
  applyUpdate(character: Character, transaction?: Transaction): Promise<void>;
  undo(characterId: string): Promise<void>;

  /** Called by the auth layer whenever the signed-in user changes (including signing out). */
  setCloudUid(uid: string | null): Promise<void>;
  syncNow(): Promise<void>;
}

async function reloadFromLocal(): Promise<Pick<AppState, "rulesetsById" | "charactersById" | "characterOrder" | "transactionsByCharacter">> {
  const rulesets = await rulesetRepository.list();
  const rulesetsById = Object.fromEntries(rulesets.map((r) => [r.id, r]));
  if (!rulesetsById[dnd5eRuleset.id]) rulesetsById[dnd5eRuleset.id] = dnd5eRuleset;

  const characters = await characterRepository.list();
  const charactersById = Object.fromEntries(characters.map((c) => [c.id, c]));
  const characterOrder = characters
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((c) => c.id);

  const transactionEntries = await Promise.all(
    characters.map(async (c) => [c.id, await transactionRepository.listByCharacter(c.id)] as const),
  );

  return { rulesetsById, charactersById, characterOrder, transactionsByCharacter: Object.fromEntries(transactionEntries) };
}

export const useAppStore = create<AppState>((set, get) => ({
  loaded: false,
  charactersById: {},
  characterOrder: [],
  rulesetsById: {},
  transactionsByCharacter: {},
  selectedCharacterId: null,

  cloudUid: null,
  syncStatus: isFirebaseConfigured() ? "idle" : "disabled",
  lastSyncedAt: null,
  syncError: null,

  async init() {
    if (get().loaded) return;

    const existingRulesets = await rulesetRepository.list();
    if (!existingRulesets.some((r) => r.id === dnd5eRuleset.id)) {
      await rulesetRepository.save(dnd5eRuleset);
    }

    set({ ...(await reloadFromLocal()), loaded: true });
  },

  selectCharacter(id) {
    set({ selectedCharacterId: id });
  },

  async saveRuleset(ruleset) {
    await rulesetRepository.save(ruleset);
    set((state) => ({ rulesetsById: { ...state.rulesetsById, [ruleset.id]: ruleset } }));

    const uid = get().cloudUid;
    if (uid && ruleset.id.startsWith("custom-")) {
      void new FirestoreRulesetRepository(uid).save({ ...ruleset, updatedAt: new Date().toISOString() }).catch(() => {});
    }
  },

  async saveCharacter(character) {
    await characterRepository.save(character);
    set((state) => ({
      charactersById: { ...state.charactersById, [character.id]: character },
      characterOrder: state.characterOrder.includes(character.id)
        ? state.characterOrder
        : [character.id, ...state.characterOrder],
    }));

    const uid = get().cloudUid;
    if (uid) void new FirestoreCharacterRepository(uid).save({ ...character, updatedAt: new Date().toISOString() }).catch(() => {});
  },

  async deleteCharacter(id) {
    const uid = get().cloudUid;
    if (uid) {
      await deleteCharacterEverywhere(uid, id, { characters: characterRepository });
    } else {
      await characterRepository.delete(id);
    }
    set((state) => {
      const { [id]: _removed, ...rest } = state.charactersById;
      return {
        charactersById: rest,
        characterOrder: state.characterOrder.filter((c) => c !== id),
        selectedCharacterId: state.selectedCharacterId === id ? null : state.selectedCharacterId,
      };
    });
  },

  async applyUpdate(character, transaction) {
    await characterRepository.save(character);
    if (transaction) await transactionRepository.append(transaction);

    set((state) => ({
      charactersById: { ...state.charactersById, [character.id]: character },
      transactionsByCharacter: transaction
        ? {
            ...state.transactionsByCharacter,
            [character.id]: [...(state.transactionsByCharacter[character.id] ?? []), transaction],
          }
        : state.transactionsByCharacter,
    }));

    const uid = get().cloudUid;
    if (uid) {
      const stamped = { ...character, updatedAt: new Date().toISOString() };
      void new FirestoreCharacterRepository(uid).save(stamped).catch(() => {});
      if (transaction) void new FirestoreTransactionRepository(uid).append(transaction).catch(() => {});
    }
  },

  async undo(characterId) {
    const character = get().charactersById[characterId];
    const transactions = get().transactionsByCharacter[characterId] ?? [];
    if (!character) return;

    const result = undoLastTransaction(character, transactions);
    if (!result) return;

    await characterRepository.save(result.character);
    const undoneTransaction = result.transactions.find((t) => t.undone && !transactions.find((o) => o.id === t.id && o.undone));
    if (undoneTransaction) await transactionRepository.update(undoneTransaction);

    set((state) => ({
      charactersById: { ...state.charactersById, [characterId]: result.character },
      transactionsByCharacter: { ...state.transactionsByCharacter, [characterId]: result.transactions },
    }));

    const uid = get().cloudUid;
    if (uid) {
      const stamped = { ...result.character, updatedAt: new Date().toISOString() };
      void new FirestoreCharacterRepository(uid).save(stamped).catch(() => {});
      if (undoneTransaction) void new FirestoreTransactionRepository(uid).update(undoneTransaction).catch(() => {});
    }
  },

  async setCloudUid(uid) {
    set({ cloudUid: uid });
    if (uid) {
      await get().syncNow();
    } else {
      set({ syncStatus: isFirebaseConfigured() ? "idle" : "disabled", lastSyncedAt: null });
    }
  },

  async syncNow() {
    const uid = get().cloudUid;
    if (!uid) return;
    set({ syncStatus: "syncing", syncError: null });
    try {
      await syncAll(uid, { characters: characterRepository, rulesets: rulesetRepository, transactions: transactionRepository });
      set({ ...(await reloadFromLocal()), syncStatus: "synced", lastSyncedAt: new Date().toISOString() });
    } catch (err) {
      set({ syncStatus: "error", syncError: err instanceof Error ? err.message : "Sync failed." });
    }
  },
}));
