import { characterSchema, rulesetSchema, type Character, type Ruleset } from "@rpg/engine";

const CURRENT_CHARACTER_SCHEMA_VERSION = 1;
const CURRENT_RULESET_SCHEMA_VERSION = 1;

export interface CharacterExportFile {
  kind: "rpg-character-manager/character";
  schemaVersion: number;
  exportedAt: string;
  character: Character;
}

export interface RulesetExportFile {
  kind: "rpg-character-manager/ruleset";
  schemaVersion: number;
  exportedAt: string;
  ruleset: Ruleset;
}

/** Registry of migrations keyed by the version they upgrade FROM. Empty today — the seam exists so future schema changes don't break old exports. */
const characterMigrations: Record<number, (data: unknown) => unknown> = {};
const rulesetMigrations: Record<number, (data: unknown) => unknown> = {};

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

export function exportCharacter(character: Character): CharacterExportFile {
  return {
    kind: "rpg-character-manager/character",
    schemaVersion: CURRENT_CHARACTER_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    character,
  };
}

export function exportRuleset(ruleset: Ruleset): RulesetExportFile {
  return {
    kind: "rpg-character-manager/ruleset",
    schemaVersion: CURRENT_RULESET_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    ruleset,
  };
}

function migrate(data: unknown, fromVersion: number, toVersion: number, migrations: Record<number, (d: unknown) => unknown>, label: string): unknown {
  let current = data;
  let version = fromVersion;
  while (version < toVersion) {
    const step = migrations[version];
    if (!step) {
      throw new ImportError(`This ${label} was saved with a newer or unsupported format (version ${version}) and can't be imported.`);
    }
    current = step(current);
    version++;
  }
  return current;
}

export function importCharacter(json: unknown): Character {
  if (typeof json !== "object" || json === null || !("character" in json) || !("schemaVersion" in json)) {
    throw new ImportError("This doesn't look like a character file exported from this app.");
  }
  const file = json as CharacterExportFile;
  const migrated = migrate(file.character, file.schemaVersion, CURRENT_CHARACTER_SCHEMA_VERSION, characterMigrations, "character");
  const parsed = characterSchema.safeParse(migrated);
  if (!parsed.success) {
    throw new ImportError(`This character file is missing or has invalid data: ${parsed.error.issues[0]?.message ?? "unknown error"}.`);
  }
  return parsed.data;
}

export function importRuleset(json: unknown): Ruleset {
  if (typeof json !== "object" || json === null || !("ruleset" in json) || !("schemaVersion" in json)) {
    throw new ImportError("This doesn't look like a ruleset file exported from this app.");
  }
  const file = json as RulesetExportFile;
  const migrated = migrate(file.ruleset, file.schemaVersion, CURRENT_RULESET_SCHEMA_VERSION, rulesetMigrations, "ruleset");
  const parsed = rulesetSchema.safeParse(migrated);
  if (!parsed.success) {
    throw new ImportError(`This ruleset file is missing or has invalid data: ${parsed.error.issues[0]?.message ?? "unknown error"}.`);
  }
  return parsed.data;
}
