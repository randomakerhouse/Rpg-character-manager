import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import type { Character, CharacterRepository, Ruleset, RulesetRepository, Transaction, TransactionRepository } from "@rpg/engine";
import { getFirebaseDb } from "./firebaseClient.js";

export class FirestoreCharacterRepository implements CharacterRepository {
  private readonly uid: string;

  constructor(uid: string) {
    this.uid = uid;
  }

  private collection() {
    return collection(getFirebaseDb(), "users", this.uid, "characters");
  }

  async list(): Promise<Character[]> {
    const snapshot = await getDocs(this.collection());
    return snapshot.docs.map((d) => d.data() as Character);
  }

  async get(id: string): Promise<Character | undefined> {
    const snapshot = await getDoc(doc(this.collection(), id));
    return snapshot.exists() ? (snapshot.data() as Character) : undefined;
  }

  async save(character: Character): Promise<void> {
    await setDoc(doc(this.collection(), character.id), character);
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.collection(), id));
  }
}

export class FirestoreRulesetRepository implements RulesetRepository {
  private readonly uid: string;

  constructor(uid: string) {
    this.uid = uid;
  }

  private collection() {
    return collection(getFirebaseDb(), "users", this.uid, "rulesets");
  }

  async list(): Promise<Ruleset[]> {
    const snapshot = await getDocs(this.collection());
    return snapshot.docs.map((d) => d.data() as Ruleset);
  }

  async get(id: string): Promise<Ruleset | undefined> {
    const snapshot = await getDoc(doc(this.collection(), id));
    return snapshot.exists() ? (snapshot.data() as Ruleset) : undefined;
  }

  async save(ruleset: Ruleset): Promise<void> {
    await setDoc(doc(this.collection(), ruleset.id), ruleset);
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.collection(), id));
  }
}

export class FirestoreTransactionRepository implements TransactionRepository {
  private readonly uid: string;

  constructor(uid: string) {
    this.uid = uid;
  }

  private collection() {
    return collection(getFirebaseDb(), "users", this.uid, "transactions");
  }

  async listByCharacter(characterId: string): Promise<Transaction[]> {
    const snapshot = await getDocs(this.collection());
    return snapshot.docs
      .map((d) => d.data() as Transaction)
      .filter((t) => t.characterId === characterId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async append(transaction: Transaction): Promise<void> {
    await setDoc(doc(this.collection(), transaction.id), transaction);
  }

  async update(transaction: Transaction): Promise<void> {
    await setDoc(doc(this.collection(), transaction.id), transaction);
  }

  async listAll(): Promise<Transaction[]> {
    const snapshot = await getDocs(this.collection());
    return snapshot.docs.map((d) => d.data() as Transaction);
  }
}
