import { describe, expect, it } from "vitest";
import { buildTransaction } from "../src/combat/index.js";

describe("buildTransaction", () => {
  it("omits trace and manualOverride entirely when not provided, rather than setting them to undefined", () => {
    const transaction = buildTransaction({
      characterId: "c1",
      type: "condition_added",
      summary: "Added condition: Poisoned",
      patch: [],
    });

    // Cloud sync (Firestore) rejects any field explicitly set to `undefined` — the key must be
    // absent entirely. `"trace" in transaction` catches the regression that `{ trace: undefined }`
    // would slip past a plain `.trace === undefined` check.
    expect("trace" in transaction).toBe(false);
    expect("manualOverride" in transaction).toBe(false);
  });

  it("still includes trace and manualOverride when explicitly provided", () => {
    const trace = { steps: [], finalValue: 5 };
    const manualOverride = { calculatedValue: 5, overriddenValue: 3, reason: "DM ruling" };
    const transaction = buildTransaction({
      characterId: "c1",
      type: "take_damage",
      summary: "Received 3 damage",
      trace,
      manualOverride,
      patch: [],
    });

    expect(transaction.trace).toEqual(trace);
    expect(transaction.manualOverride).toEqual(manualOverride);
  });
});
