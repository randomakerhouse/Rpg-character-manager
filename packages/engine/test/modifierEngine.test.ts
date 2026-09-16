import { describe, expect, it } from "vitest";
import type { Character } from "../src/model/character.js";
import type { Modifier } from "../src/model/modifier.js";
import { leaf } from "../src/model/condition.js";
import { literal } from "../src/model/common.js";
import { findMatchingModifiers } from "../src/modifiers/matcher.js";
import { runPipeline } from "../src/modifiers/pipeline.js";
import type { EventContext } from "../src/events/context.js";
import { CORE_EVENTS } from "../src/events/catalog.js";
import { PIPELINE_STAGES } from "../src/model/effect.js";

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: "char-1",
    rulesetId: "dnd5e",
    name: "Test Hero",
    level: 5,
    schemaVersion: 1,
    stats: {},
    resources: {},
    weapons: [],
    items: [],
    abilities: [],
    spells: [],
    activeConditions: [],
    intrinsicModifiers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeModifier(overrides: Partial<Modifier> & Pick<Modifier, "id" | "name" | "effects">): Modifier {
  return {
    description: undefined,
    humanReadableSummary: overrides.name,
    sourceRef: { kind: "intrinsic" },
    trigger: CORE_EVENTS.beforeDamageReceived,
    conditions: null,
    activationMode: "AUTO",
    priority: 0,
    enabled: true,
    ...overrides,
  };
}

describe("take-damage pipeline (spec section 4 example)", () => {
  it("applies a flat slashing resistance modifier and produces a full trace", () => {
    const character = makeCharacter({
      intrinsicModifiers: [
        makeModifier({
          id: "mod-1",
          name: "Resistenza ai tagli",
          conditions: leaf("damage.type", "eq", "slashing"),
          effects: [{ op: "subtract", stage: "flatReduction", target: "workingValue", value: literal(5) }],
        }),
      ],
    });

    const context: EventContext = { damage: { amount: 17, type: "slashing" } };
    const matched = findMatchingModifiers(character, CORE_EVENTS.beforeDamageReceived, context);

    expect(matched.auto).toHaveLength(1);
    expect(matched.prompt).toHaveLength(0);

    const result = runPipeline({
      baseValue: 17,
      context,
      entries: matched.auto,
      pipelineStages: [...PIPELINE_STAGES],
    });

    expect(result.trace.finalValue).toBe(12);
    expect(result.trace.steps.at(-1)).toMatchObject({ after: 12 });
  });

  it("does not apply a modifier whose condition does not match the current damage type", () => {
    const character = makeCharacter({
      intrinsicModifiers: [
        makeModifier({
          id: "mod-1",
          name: "Resistenza ai tagli",
          conditions: leaf("damage.type", "eq", "slashing"),
          effects: [{ op: "subtract", stage: "flatReduction", target: "workingValue", value: literal(5) }],
        }),
      ],
    });

    const context: EventContext = { damage: { amount: 10, type: "fire" } };
    const matched = findMatchingModifiers(character, CORE_EVENTS.beforeDamageReceived, context);
    expect(matched.auto).toHaveLength(0);

    const result = runPipeline({
      baseValue: 10,
      context,
      entries: matched.auto,
      pipelineStages: [...PIPELINE_STAGES],
    });
    expect(result.trace.finalValue).toBe(10);
  });

  it("combines resistance (x0.5, rounded down) then a flat reduction, in pipeline order", () => {
    const character = makeCharacter({
      intrinsicModifiers: [
        makeModifier({
          id: "mod-resist",
          name: "Fire Resistance",
          effects: [{ op: "grantResistance", stage: "resistance", damageType: "fire" }],
        }),
        makeModifier({
          id: "mod-armor",
          name: "Armor Reduction",
          effects: [{ op: "subtract", stage: "flatReduction", target: "workingValue", value: literal(3) }],
        }),
      ],
    });

    const context: EventContext = { damage: { amount: 21, type: "fire" } };
    const matched = findMatchingModifiers(character, CORE_EVENTS.beforeDamageReceived, context);
    expect(matched.auto).toHaveLength(2);

    const result = runPipeline({
      baseValue: 21,
      context,
      entries: matched.auto,
      pipelineStages: [...PIPELINE_STAGES],
    });

    // 21 * 0.5 = 10.5 -> floor 10, then -3 = 7
    expect(result.trace.finalValue).toBe(7);
  });

  it("respects modifier priority ordering within the same stage", () => {
    const character = makeCharacter({
      intrinsicModifiers: [
        makeModifier({
          id: "mod-b",
          name: "Second",
          priority: 10,
          effects: [{ op: "multiply", stage: "multiplicative", target: "workingValue", value: literal(2) }],
        }),
        makeModifier({
          id: "mod-a",
          name: "First",
          priority: 1,
          effects: [{ op: "add", stage: "multiplicative", target: "workingValue", value: literal(1) }],
        }),
      ],
    });

    const context: EventContext = { damage: { amount: 10, type: "bludgeoning" } };
    const matched = findMatchingModifiers(character, CORE_EVENTS.beforeDamageReceived, context);

    const result = runPipeline({
      baseValue: 10,
      context,
      entries: matched.auto,
      pipelineStages: [...PIPELINE_STAGES],
    });

    // priority 1 (add 1) runs before priority 10 (multiply 2): (10+1)*2 = 22
    expect(result.trace.finalValue).toBe(22);
  });

  it("immunity reduces damage of the matching type to zero", () => {
    const character = makeCharacter({
      intrinsicModifiers: [
        makeModifier({
          id: "mod-immune",
          name: "Poison Immunity",
          effects: [{ op: "grantImmunity", stage: "resistance", damageType: "poison" }],
        }),
      ],
    });

    const context: EventContext = { damage: { amount: 15, type: "poison" } };
    const matched = findMatchingModifiers(character, CORE_EVENTS.beforeDamageReceived, context);
    const result = runPipeline({
      baseValue: 15,
      context,
      entries: matched.auto,
      pipelineStages: [...PIPELINE_STAGES],
    });
    expect(result.trace.finalValue).toBe(0);
  });

  it("vulnerability doubles damage of the matching type", () => {
    const character = makeCharacter({
      intrinsicModifiers: [
        makeModifier({
          id: "mod-vuln",
          name: "Cold Vulnerability",
          effects: [{ op: "grantVulnerability", stage: "resistance", damageType: "cold" }],
        }),
      ],
    });

    const context: EventContext = { damage: { amount: 8, type: "cold" } };
    const matched = findMatchingModifiers(character, CORE_EVENTS.beforeDamageReceived, context);
    const result = runPipeline({
      baseValue: 8,
      context,
      entries: matched.auto,
      pipelineStages: [...PIPELINE_STAGES],
    });
    expect(result.trace.finalValue).toBe(16);
  });
});

describe("PROMPT / MANUAL activation modes", () => {
  it("buckets a PROMPT ability like Electric Fury separately from AUTO, so the player must opt in", () => {
    const character = makeCharacter({
      abilities: [
        {
          id: "ability-1",
          name: "Electric Fury",
          description: "When attacking with a weapon you may add 1d6 lightning damage.",
          trigger: CORE_EVENTS.onWeaponHit,
          conditions: null,
          effects: [{ op: "addDice", stage: "additive", target: "workingValue", dice: "1d6", damageType: "lightning" }],
          activationMode: "PROMPT",
          tags: [],
        },
      ],
    });

    const context: EventContext = { weapon: { tags: ["sword"] } };
    const matched = findMatchingModifiers(character, CORE_EVENTS.onWeaponHit, context);

    expect(matched.auto).toHaveLength(0);
    expect(matched.prompt).toHaveLength(1);
    expect(matched.prompt[0]!.name).toBe("Electric Fury");
  });

  it("never auto-applies a MANUAL modifier even when its condition matches", () => {
    const character = makeCharacter({
      intrinsicModifiers: [
        makeModifier({
          id: "mod-manual",
          name: "Defensive Stance",
          activationMode: "MANUAL",
          effects: [{ op: "subtract", stage: "flatReduction", target: "workingValue", value: literal(3) }],
        }),
      ],
    });

    const context: EventContext = { damage: { amount: 10, type: "bludgeoning" } };
    const matched = findMatchingModifiers(character, CORE_EVENTS.beforeDamageReceived, context);

    expect(matched.auto).toHaveLength(0);
    expect(matched.manual).toHaveLength(1);
  });
});

describe("limited uses", () => {
  it("excludes a modifier with zero uses remaining", () => {
    const character = makeCharacter({
      intrinsicModifiers: [
        makeModifier({
          id: "mod-charges",
          name: "Last Stand",
          uses: { max: 1, remaining: 0 },
          effects: [{ op: "subtract", stage: "flatReduction", target: "workingValue", value: literal(5) }],
        }),
      ],
    });

    const context: EventContext = { damage: { amount: 10, type: "bludgeoning" } };
    const matched = findMatchingModifiers(character, CORE_EVENTS.beforeDamageReceived, context);
    expect(matched.auto).toHaveLength(0);
  });
});
