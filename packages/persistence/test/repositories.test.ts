import { beforeEach, describe, expect, it } from "vitest";
import { createCharacter, dnd5eRuleset } from "@rpg/engine";
import { RpgDatabase } from "../src/db.js";
import { DexieCharacterRepository } from "../src/characterRepository.js";
import { DexieRulesetRepository } from "../src/rulesetRepository.js";
import { exportCharacter, importCharacter, ImportError } from "../src/exportImport.js";

describe("DexieCharacterRepository", () => {
  let db: RpgDatabase;

  beforeEach(() => {
    db = new RpgDatabase(`test-db-${Math.random()}`);
  });

  it("saves and retrieves a character", async () => {
    const repo = new DexieCharacterRepository(db);
    const character = createCharacter({ name: "Aria", ruleset: dnd5eRuleset });

    await repo.save(character);
    const loaded = await repo.get(character.id);

    expect(loaded?.name).toBe("Aria");
  });

  it("lists all saved characters", async () => {
    const repo = new DexieCharacterRepository(db);
    await repo.save(createCharacter({ name: "Aria", ruleset: dnd5eRuleset }));
    await repo.save(createCharacter({ name: "Borin", ruleset: dnd5eRuleset }));

    const all = await repo.list();
    expect(all.map((c) => c.name).sort()).toEqual(["Aria", "Borin"]);
  });

  it("deletes a character", async () => {
    const repo = new DexieCharacterRepository(db);
    const character = createCharacter({ name: "Aria", ruleset: dnd5eRuleset });
    await repo.save(character);
    await repo.delete(character.id);
    expect(await repo.get(character.id)).toBeUndefined();
  });
});

describe("DexieRulesetRepository", () => {
  it("saves and retrieves a ruleset", async () => {
    const db = new RpgDatabase(`test-db-${Math.random()}`);
    const repo = new DexieRulesetRepository(db);
    await repo.save(dnd5eRuleset);
    const loaded = await repo.get("dnd5e");
    expect(loaded?.name).toBe("Dungeons & Dragons 5th Edition");
  });
});

describe("character export/import round trip", () => {
  it("round-trips a character through export and import", () => {
    const character = createCharacter({ name: "Aria", ruleset: dnd5eRuleset });
    const file = exportCharacter(character);
    const json = JSON.parse(JSON.stringify(file));
    const imported = importCharacter(json);
    expect(imported).toEqual(character);
  });

  it("rejects a file that isn't a character export", () => {
    expect(() => importCharacter({ foo: "bar" })).toThrow(ImportError);
  });

  it("rejects a character file with invalid data via a human-readable error", () => {
    const file = exportCharacter(createCharacter({ name: "Aria", ruleset: dnd5eRuleset }));
    const corrupted = { ...file, character: { ...file.character, name: undefined } };
    expect(() => importCharacter(corrupted)).toThrow(ImportError);
  });
});
