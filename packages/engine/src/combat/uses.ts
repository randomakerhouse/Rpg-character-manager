import type { Character } from "../model/character.js";
import type { PatchEntry } from "./transactions.js";

interface HasUses {
  id: string;
  uses?: { max: number; remaining: number; recharge?: string };
}

function decrementIn<T extends HasUses>(list: T[], entryId: string, pathPrefix: string): { list: T[]; patch: PatchEntry[] } {
  const index = list.findIndex((item) => item.id === entryId && item.uses);
  if (index === -1) return { list, patch: [] };
  const before = list[index]!.uses!.remaining;
  const after = Math.max(0, before - 1);
  const nextList = list.map((item, i) => (i === index ? { ...item, uses: { ...item.uses!, remaining: after } } : item));
  return { list: nextList, patch: [{ path: `${pathPrefix}.${index}.uses.remaining`, before, after }] };
}

/** Decrements the `uses.remaining` counter for a Modifier or Ability by id, wherever it lives on the character. */
export function consumeEntryUse(character: Character, entryId: string): { character: Character; patch: PatchEntry[] } {
  const abilities = decrementIn(character.abilities, entryId, "abilities");
  if (abilities.patch.length > 0) {
    return { character: { ...character, abilities: abilities.list }, patch: abilities.patch };
  }

  const intrinsic = decrementIn(character.intrinsicModifiers, entryId, "intrinsicModifiers");
  if (intrinsic.patch.length > 0) {
    return { character: { ...character, intrinsicModifiers: intrinsic.list }, patch: intrinsic.patch };
  }

  for (let i = 0; i < character.weapons.length; i++) {
    const result = decrementIn(character.weapons[i]!.modifiers, entryId, `weapons.${i}.modifiers`);
    if (result.patch.length > 0) {
      const weapons = character.weapons.map((w, wi) => (wi === i ? { ...w, modifiers: result.list } : w));
      return { character: { ...character, weapons }, patch: result.patch };
    }
  }

  for (let i = 0; i < character.items.length; i++) {
    const result = decrementIn(character.items[i]!.modifiers, entryId, `items.${i}.modifiers`);
    if (result.patch.length > 0) {
      const items = character.items.map((it, ii) => (ii === i ? { ...it, modifiers: result.list } : it));
      return { character: { ...character, items }, patch: result.patch };
    }
  }

  return { character, patch: [] };
}
