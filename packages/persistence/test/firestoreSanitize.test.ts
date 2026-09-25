import { describe, expect, it } from "vitest";
import { stripUndefinedDeep } from "../src/cloud/firestoreSanitize.js";

describe("stripUndefinedDeep (Firestore rejects undefined field values)", () => {
  it("removes top-level undefined properties", () => {
    expect(stripUndefinedDeep({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it("removes undefined properties nested arbitrarily deep", () => {
    expect(stripUndefinedDeep({ a: { b: { c: undefined, d: 2 } } })).toEqual({ a: { b: { d: 2 } } });
  });

  it("keeps null values (Firestore supports null, just not undefined)", () => {
    expect(stripUndefinedDeep({ a: null })).toEqual({ a: null });
  });

  it("processes arrays element by element, replacing undefined entries with null", () => {
    expect(stripUndefinedDeep({ list: [1, undefined, { x: undefined, y: 3 }] })).toEqual({
      list: [1, null, { y: 3 }],
    });
  });

  it("matches the exact shape that broke sync: a Transaction with an omitted trace", () => {
    const transaction = {
      id: "t1",
      characterId: "c1",
      timestamp: "2024-01-01T00:00:00Z",
      type: "condition_added",
      summary: "Added condition: Poisoned",
      trace: undefined,
      manualOverride: undefined,
      patch: [{ path: "activeConditions", before: [], after: [{ id: "ac1" }] }],
      undone: false,
    };
    const sanitized = stripUndefinedDeep(transaction);
    expect(sanitized).not.toHaveProperty("trace");
    expect(sanitized).not.toHaveProperty("manualOverride");
    expect(sanitized.summary).toBe("Added condition: Poisoned");
  });

  it("leaves fully-defined objects unchanged", () => {
    const value = { a: 1, b: "two", c: [1, 2, 3], d: { e: true } };
    expect(stripUndefinedDeep(value)).toEqual(value);
  });
});
