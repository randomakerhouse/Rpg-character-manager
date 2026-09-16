import type { Character } from "../model/character.js";
import { buildTransaction, type PatchEntry } from "./transactions.js";
import type { Transaction } from "../model/transaction.js";

/**
 * Equipping/unequipping toggles whether an item's or weapon's modifiers are currently
 * "active" (collected by the matcher) — section 11's "equip auto-activates its effects".
 */
export function toggleEquipped(
  character: Character,
  kind: "weapon" | "item",
  id: string,
): { character: Character; transaction: Transaction } {
  const list = kind === "weapon" ? character.weapons : character.items;
  const index = list.findIndex((entry) => entry.id === id);
  if (index === -1) {
    throw new Error(`${kind} "${id}" not found on character "${character.id}".`);
  }

  const before = list[index]!.equipped;
  const after = !before;
  const path = `${kind === "weapon" ? "weapons" : "items"}.${index}.equipped`;
  const patch: PatchEntry[] = [{ path, before, after }];

  const nextList = list.map((entry, i) => (i === index ? { ...entry, equipped: after } : entry));
  const nextCharacter: Character =
    kind === "weapon" ? { ...character, weapons: nextList as Character["weapons"] } : { ...character, items: nextList as Character["items"] };

  const transaction = buildTransaction({
    characterId: character.id,
    type: "equip_toggle",
    summary: `${after ? "Equipped" : "Unequipped"} ${list[index]!.name}`,
    patch,
  });

  return { character: nextCharacter, transaction };
}
