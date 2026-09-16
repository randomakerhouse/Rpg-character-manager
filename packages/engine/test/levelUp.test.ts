import { describe, expect, it } from "vitest";
import { createCharacter } from "../src/character/factory.js";
import { dnd5eRuleset } from "../src/rulesets/dnd5e/index.js";
import { applyLevelUp, undoLastTransaction } from "../src/combat/index.js";

describe("applyLevelUp", () => {
  it("increments level and applies permanent stat + max HP increases", () => {
    const character = createCharacter({
      name: "Aria",
      ruleset: dnd5eRuleset,
      statValues: { strength: { current: 16 }, hp: { current: 20, max: 20 } },
    });

    const { character: leveled, transaction } = applyLevelUp({
      character,
      ruleset: dnd5eRuleset,
      statIncreases: [{ statId: "strength", delta: 2 }],
      maxHpIncrease: 8,
    });

    expect(leveled.level).toBe(2);
    expect(leveled.stats.strength!.current).toBe(18);
    expect(leveled.stats.hp!.max).toBe(28);
    expect(leveled.stats.hp!.current).toBe(28);
    expect(transaction.summary).toContain("level 2");
  });

  it("clamps stat increases to the ruleset's max (e.g. 20 for ability scores... here 30)", () => {
    const character = createCharacter({ name: "Aria", ruleset: dnd5eRuleset, statValues: { strength: { current: 29 } } });
    const { character: leveled } = applyLevelUp({ character, ruleset: dnd5eRuleset, statIncreases: [{ statId: "strength", delta: 5 }] });
    expect(leveled.stats.strength!.current).toBe(30);
  });

  it("is fully undoable as a single transaction", () => {
    const character = createCharacter({ name: "Aria", ruleset: dnd5eRuleset, statValues: { strength: { current: 10 } } });
    const { character: leveled, transaction } = applyLevelUp({ character, ruleset: dnd5eRuleset, statIncreases: [{ statId: "strength", delta: 1 }] });

    const undone = undoLastTransaction(leveled, [transaction]);
    expect(undone!.character.level).toBe(1);
    expect(undone!.character.stats.strength!.current).toBe(10);
  });
});
