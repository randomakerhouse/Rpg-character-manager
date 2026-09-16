import { describe, expect, it } from "vitest";
import { createCharacter } from "../src/character/factory.js";
import { dnd5eRuleset } from "../src/rulesets/dnd5e/index.js";
import {
  applyTakeDamage,
  calculateTakeDamage,
  previewTakeDamage,
  undoLastTransaction,
  toggleEquipped,
  applyHeal,
  calculateHeal,
  previewHeal,
  rollWeaponDamage,
  advanceConditionDurations,
} from "../src/combat/index.js";
import type { Modifier } from "../src/model/modifier.js";
import type { Weapon } from "../src/model/character.js";
import { leaf } from "../src/model/condition.js";
import { literal } from "../src/model/common.js";
import { CORE_EVENTS } from "../src/events/catalog.js";

function heavyArmorModifier(): Modifier {
  return {
    id: "mod-heavy-armor",
    name: "Heavy Armor",
    humanReadableSummary: "When you receive Slashing damage, reduce it by 5.",
    sourceRef: { kind: "intrinsic" },
    trigger: CORE_EVENTS.beforeDamageReceived,
    conditions: leaf("damage.type", "eq", "slashing"),
    effects: [{ op: "subtract", stage: "flatReduction", target: "workingValue", value: literal(5) }],
    activationMode: "AUTO",
    priority: 0,
    enabled: true,
  };
}

describe("take damage end-to-end (spec section 4)", () => {
  it("reduces 17 slashing damage to 12 via Heavy Armor and drops HP 70 -> 58", () => {
    let character = createCharacter({ name: "Aria", ruleset: dnd5eRuleset, statValues: { hp: { current: 70, max: 70 } } });
    character = { ...character, intrinsicModifiers: [heavyArmorModifier()] };

    const { matched, context } = previewTakeDamage(character, 17, "slashing");
    expect(matched.auto).toHaveLength(1);

    const pipelineResult = calculateTakeDamage(17, context, matched.auto, dnd5eRuleset);
    expect(pipelineResult.trace.finalValue).toBe(12);

    const { character: updated, transaction } = applyTakeDamage({
      character,
      finalDamage: pipelineResult.trace.finalValue,
      trace: pipelineResult.trace,
      ruleset: dnd5eRuleset,
      context,
    });

    expect(updated.stats.hp!.current).toBe(58);
    expect(transaction.summary).toContain("12");
  });

  it("undo restores HP exactly (section 47 safety net)", () => {
    let character = createCharacter({ name: "Aria", ruleset: dnd5eRuleset, statValues: { hp: { current: 70, max: 70 } } });
    const { context } = previewTakeDamage(character, 17, "slashing");
    const pipelineResult = calculateTakeDamage(17, context, [], dnd5eRuleset);
    const { character: damaged, transaction } = applyTakeDamage({
      character,
      finalDamage: pipelineResult.trace.finalValue,
      trace: pipelineResult.trace,
      ruleset: dnd5eRuleset,
      context,
    });
    expect(damaged.stats.hp!.current).toBe(53);

    const undone = undoLastTransaction(damaged, [transaction]);
    expect(undone).not.toBeNull();
    expect(undone!.character.stats.hp!.current).toBe(70);
    expect(undone!.transactions[0]!.undone).toBe(true);
  });

  it("absorbs damage with temporary HP before touching real HP", () => {
    let character = createCharacter({
      name: "Aria",
      ruleset: dnd5eRuleset,
      statValues: { hp: { current: 40, max: 40 }, temporaryHp: { current: 10 } },
    });
    const { context } = previewTakeDamage(character, 15, "fire");
    const pipelineResult = calculateTakeDamage(15, context, [], dnd5eRuleset);
    const { character: updated } = applyTakeDamage({
      character,
      finalDamage: pipelineResult.trace.finalValue,
      trace: pipelineResult.trace,
      ruleset: dnd5eRuleset,
      context,
    });

    expect(updated.stats.temporaryHp!.current).toBe(0);
    expect(updated.stats.hp!.current).toBe(35);
  });

  it("supports a manual override with a required reason (section 27)", () => {
    const character = createCharacter({ name: "Aria", ruleset: dnd5eRuleset, statValues: { hp: { current: 50, max: 50 } } });
    const { context } = previewTakeDamage(character, 12, "bludgeoning");
    const pipelineResult = calculateTakeDamage(12, context, [], dnd5eRuleset);

    const { character: updated, transaction } = applyTakeDamage({
      character,
      finalDamage: 10,
      trace: pipelineResult.trace,
      ruleset: dnd5eRuleset,
      context,
      manualOverride: { calculatedValue: 12, overriddenValue: 10, reason: "DM ruling" },
    });

    expect(updated.stats.hp!.current).toBe(40);
    expect(transaction.manualOverride).toEqual({ calculatedValue: 12, overriddenValue: 10, reason: "DM ruling" });
  });
});

describe("heal workflow", () => {
  it("heals but clamps at max HP", () => {
    const character = createCharacter({ name: "Aria", ruleset: dnd5eRuleset, statValues: { hp: { current: 66, max: 70 } } });
    const { context } = previewHeal(character, 8);
    const pipelineResult = calculateHeal(8, context, [], dnd5eRuleset);
    const { character: healed } = applyHeal({ character, finalHealing: pipelineResult.trace.finalValue, trace: pipelineResult.trace });
    expect(healed.stats.hp!.current).toBe(70);
  });
});

describe("equip toggling activates/deactivates modifiers", () => {
  it("a weapon's modifiers only apply while equipped", () => {
    const weapon: Weapon = {
      id: "sword-1",
      name: "Thunder Blade",
      damageComponents: [{ dice: "1d8", damageType: "slashing" }],
      tags: ["sword"],
      equipped: false,
      modifiers: [
        {
          ...heavyArmorModifier(),
          id: "mod-conditional",
          sourceRef: { kind: "weapon", weaponId: "sword-1" },
        },
      ],
    };
    let character = createCharacter({ name: "Aria", ruleset: dnd5eRuleset });
    character = { ...character, weapons: [weapon] };

    let preview = previewTakeDamage(character, 10, "slashing");
    expect(preview.matched.auto).toHaveLength(0);

    const { character: equipped } = toggleEquipped(character, "weapon", "sword-1");
    preview = previewTakeDamage(equipped, 10, "slashing");
    expect(preview.matched.auto).toHaveLength(1);
  });
});

describe("rollWeaponDamage keeps damage types separated (section 6/7)", () => {
  it("sums the weapon's base damage and any accepted bonus dice by type", () => {
    const weapon: Weapon = {
      id: "sword-1",
      name: "Longsword",
      damageComponents: [{ dice: "1d8", damageType: "slashing", bonus: 4 }],
      tags: ["sword"],
      equipped: true,
      modifiers: [],
    };

    const rolled = rollWeaponDamage(weapon, [
      {
        id: "electric-fury",
        name: "Electric Fury",
        sourceLabel: "Ability",
        trigger: CORE_EVENTS.onWeaponHit,
        conditions: null,
        effects: [{ op: "addDice", stage: "additive", target: "workingValue", dice: "1d6", damageType: "lightning" }],
        activationMode: "PROMPT",
        priority: 0,
        enabled: true,
      },
    ], { rng: () => 0.5 });

    expect(Object.keys(rolled.totalsByType).sort()).toEqual(["lightning", "slashing"]);
  });
});

describe("advanceConditionDurations", () => {
  it("decrements and expires conditions", () => {
    let character = createCharacter({ name: "Aria", ruleset: dnd5eRuleset });
    character = {
      ...character,
      activeConditions: [{ id: "ac-1", conditionDefId: "poisoned", remaining: { kind: "turns", amount: 1 }, modifiers: [] }],
    };

    const { character: advanced, expired } = advanceConditionDurations(character);
    expect(expired).toHaveLength(1);
    expect(advanced.activeConditions).toHaveLength(0);
  });
});
