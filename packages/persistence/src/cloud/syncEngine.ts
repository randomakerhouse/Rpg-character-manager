import type { Character, Ruleset, Transaction } from "@rpg/engine";
import { DexieCharacterRepository } from "../characterRepository.js";
import { DexieRulesetRepository } from "../rulesetRepository.js";
import { DexieTransactionRepository } from "../transactionRepository.js";
import { FirestoreCharacterRepository, FirestoreRulesetRepository, FirestoreTransactionRepository } from "./firestoreRepositories.js";

export interface SyncResult {
  charactersPushed: number;
  charactersPulled: number;
  rulesetsPushed: number;
  rulesetsPulled: number;
  transactionsSynced: number;
}

export interface Stamped {
  id: string;
  updatedAt?: string;
}

/** Last-write-wins by `updatedAt` (ISO strings compare chronologically). Missing timestamps sort oldest. */
export function isNewer(a: Stamped, b: Stamped): boolean {
  return (a.updatedAt ?? "") > (b.updatedAt ?? "");
}

/** Pushes/pulls a single record set so both sides end up holding whichever copy is newer. Exported for unit testing. */
export async function reconcile<T extends Stamped>(
  localList: T[],
  remoteList: T[],
  pushOne: (item: T) => Promise<void>,
  pullOne: (item: T) => Promise<void>,
): Promise<{ pushed: number; pulled: number }> {
  const localById = new Map(localList.map((item) => [item.id, item]));
  const remoteById = new Map(remoteList.map((item) => [item.id, item]));
  const allIds = new Set([...localById.keys(), ...remoteById.keys()]);

  let pushed = 0;
  let pulled = 0;

  for (const id of allIds) {
    const local = localById.get(id);
    const remote = remoteById.get(id);

    if (local && !remote) {
      await pushOne(local);
      pushed++;
    } else if (remote && !local) {
      await pullOne(remote);
      pulled++;
    } else if (local && remote && local.updatedAt !== remote.updatedAt) {
      if (isNewer(local, remote)) {
        await pushOne(local);
        pushed++;
      } else {
        await pullOne(remote);
        pulled++;
      }
    }
  }

  return { pushed, pulled };
}

/**
 * Two-way sync between the local IndexedDB store and this user's Firestore data.
 * Runs on sign-in, app start (if already signed in), and reconnect. Characters and custom
 * rulesets use last-write-wins by `updatedAt`; transactions are unioned by id, and once a
 * transaction is undone on any device it stays undone everywhere (the safer default).
 */
export async function syncAll(
  uid: string,
  local: { characters: DexieCharacterRepository; rulesets: DexieRulesetRepository; transactions: DexieTransactionRepository },
): Promise<SyncResult> {
  const remoteCharacters = new FirestoreCharacterRepository(uid);
  const remoteRulesets = new FirestoreRulesetRepository(uid);
  const remoteTransactions = new FirestoreTransactionRepository(uid);

  const [localChars, remoteChars] = await Promise.all([local.characters.list(), remoteCharacters.list()]);
  const { pushed: charactersPushed, pulled: charactersPulled } = await reconcile<Character>(
    localChars,
    remoteChars,
    (c) => remoteCharacters.save(c),
    (c) => local.characters.importRaw(c),
  );

  const [localRulesetsAll, remoteRulesets_] = await Promise.all([local.rulesets.list(), remoteRulesets.list()]);
  // Only custom rulesets are synced — built-in presets (like the D&D 5e ruleset) ship in the app code itself.
  const localRulesets = localRulesetsAll.filter((r) => r.id.startsWith("custom-"));
  const { pushed: rulesetsPushed, pulled: rulesetsPulled } = await reconcile<Ruleset>(
    localRulesets,
    remoteRulesets_,
    (r) => remoteRulesets.save(r),
    (r) => local.rulesets.importRaw(r),
  );

  const [localTx, remoteTx] = await Promise.all([local.transactions.listAll(), remoteTransactions.listAll()]);
  const localTxById = new Map(localTx.map((t) => [t.id, t]));
  const remoteTxById = new Map(remoteTx.map((t) => [t.id, t]));
  const allTxIds = new Set([...localTxById.keys(), ...remoteTxById.keys()]);
  let transactionsSynced = 0;

  for (const id of allTxIds) {
    const l = localTxById.get(id);
    const r = remoteTxById.get(id);
    if (l && r) {
      if (l.undone !== r.undone) {
        const merged: Transaction = { ...l, undone: l.undone || r.undone };
        await Promise.all([local.transactions.update(merged), remoteTransactions.update(merged)]);
        transactionsSynced++;
      }
    } else if (l && !r) {
      await remoteTransactions.append(l);
      transactionsSynced++;
    } else if (r && !l) {
      await local.transactions.append(r);
      transactionsSynced++;
    }
  }

  return { charactersPushed, charactersPulled, rulesetsPushed, rulesetsPulled, transactionsSynced };
}

/** Deletes a character both locally and in the cloud, so it doesn't get resurrected by a later sync. */
export async function deleteCharacterEverywhere(uid: string, characterId: string, local: { characters: DexieCharacterRepository }): Promise<void> {
  await Promise.all([local.characters.delete(characterId), new FirestoreCharacterRepository(uid).delete(characterId)]);
}
