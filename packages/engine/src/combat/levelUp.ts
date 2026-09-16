import type { Character } from "../model/character.js";
import type { Ruleset } from "../model/ruleset.js";
import { applySideEffects } from "./sideEffects.js";
import { buildTransaction, type PatchEntry } from "./transactions.js";
import type { Transaction } from "../model/transaction.js";
import { literal } from "../model/common.js";

export interface StatIncrease {
  statId: string;
  delta: number;
}

export interface LevelUpInput {
  character: Character;
  ruleset: Ruleset;
  /** Permanent stat changes (ability score increases, etc.) — clamped to the stat's min/max. */
  statIncreases?: StatIncrease[];
  /** Permanent increase to max HP (current HP rises by the same amount, as is typical on level-up). */
  maxHpIncrease?: number;
}

/**
 * Bumps a character's level and applies any permanent stat/HP increases that came with it,
 * as one undoable transaction (section: level-ups as a source of permanent stat changes).
 */
export function applyLevelUp(input: LevelUpInput): { character: Character; transaction: Transaction } {
  const { character, ruleset, statIncreases = [], maxHpIncrease = 0 } = input;

  const beforeLevel = character.level;
  const afterLevel = beforeLevel + 1;
  const patch: PatchEntry[] = [{ path: "level", before: beforeLevel, after: afterLevel }];

  let updated: Character = { ...character, level: afterLevel };

  if (statIncreases.length > 0) {
    const applied = applySideEffects(
      updated,
      ruleset,
      statIncreases
        .filter((s) => s.delta !== 0)
        .map((s) => ({ entryId: "level_up", entryName: "Level Up", effect: { op: "modifyStat" as const, statId: s.statId, delta: literal(s.delta) } })),
      {},
    );
    updated = applied.character;
    patch.push(...applied.patch);
  }

  const hpStat = updated.stats.hp;
  if (hpStat && maxHpIncrease !== 0) {
    const beforeMax = hpStat.max ?? hpStat.current;
    const afterMax = beforeMax + maxHpIncrease;
    const beforeCurrent = hpStat.current;
    const afterCurrent = beforeCurrent + maxHpIncrease;
    updated = { ...updated, stats: { ...updated.stats, hp: { ...hpStat, max: afterMax, current: afterCurrent } } };
    patch.push({ path: "stats.hp.max", before: beforeMax, after: afterMax });
    patch.push({ path: "stats.hp.current", before: beforeCurrent, after: afterCurrent });
  }

  const statSummary = statIncreases
    .filter((s) => s.delta !== 0)
    .map((s) => `${s.delta >= 0 ? "+" : ""}${s.delta} ${ruleset.statDefinitions.find((d) => d.id === s.statId)?.name ?? s.statId}`)
    .join(", ");

  const transaction = buildTransaction({
    characterId: character.id,
    type: "level_up",
    summary: [`Reached level ${afterLevel}`, statSummary, maxHpIncrease ? `+${maxHpIncrease} max HP` : ""].filter(Boolean).join(" — "),
    patch,
  });

  return { character: updated, transaction };
}
