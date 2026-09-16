import type { Character, CharacterStat } from "../model/character.js";
import type { Ruleset, StatDefinition } from "../model/ruleset.js";
import { evaluateFormula, parseFormula } from "../formula/index.js";
import { ModifierEngineError } from "../modifiers/errors.js";
import { findMatchingModifiers } from "../modifiers/matcher.js";
import { runPipeline } from "../modifiers/pipeline.js";
import type { CalculationTrace } from "../model/transaction.js";

export interface ResolvedStat {
  statId: string;
  value: number;
  base: number;
  max?: number;
  isOverridden: boolean;
  /** Full breakdown so the UI can answer "why is this 19?" (section 13). */
  trace: CalculationTrace;
}

function findStatDef(ruleset: Ruleset, statId: string): StatDefinition {
  const def = ruleset.statDefinitions.find((s) => s.id === statId);
  if (!def) throw new ModifierEngineError(`Unknown stat "${statId}" for ruleset "${ruleset.id}".`);
  return def;
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** The event a stat's own AUTO modifiers (e.g. "+2 AC while shield is equipped") react to. */
export function statCalculatedTrigger(statId: string): string {
  return `stat_calculated:${statId}`;
}

/**
 * Applies any AUTO modifiers registered against this stat (e.g. an equipped shield's "+2 AC")
 * on top of a base value, returning the extra trace steps for transparency.
 */
function applyStatModifiers(character: Character, ruleset: Ruleset, statId: string, baseValue: number, baseLabel: string) {
  const matched = findMatchingModifiers(character, statCalculatedTrigger(statId), {});
  if (matched.auto.length === 0) {
    return { value: baseValue, trace: { steps: [{ label: baseLabel, before: baseValue, after: baseValue }], finalValue: baseValue } };
  }
  const result = runPipeline({
    baseValue,
    baseLabel,
    context: {},
    entries: matched.auto,
    pipelineStages: ruleset.pipelineStages,
  });
  return { value: result.trace.finalValue, trace: result.trace };
}

/**
 * Resolves a stat's current effective value, following "calculated" formulas that may
 * reference other stats, then layering on any AUTO modifiers targeting this stat.
 * Manual overrides always win (section 27). Cycle-safe.
 */
export function resolveStat(
  character: Character,
  ruleset: Ruleset,
  statId: string,
  visiting: Set<string> = new Set(),
): ResolvedStat {
  if (visiting.has(statId)) {
    throw new ModifierEngineError(`Circular stat formula detected involving "${statId}".`);
  }

  const def = findStatDef(ruleset, statId);
  const stat: CharacterStat | undefined = character.stats[statId];

  if (stat?.manualOverride) {
    return {
      statId,
      value: stat.manualOverride.value,
      base: stat.base,
      max: stat.max,
      isOverridden: true,
      trace: {
        steps: [{ label: `Manual override (${stat.manualOverride.reason})`, before: stat.base, after: stat.manualOverride.value }],
        finalValue: stat.manualOverride.value,
      },
    };
  }

  if (def.valueType === "calculated") {
    if (!def.formula) {
      throw new ModifierEngineError(`Stat "${statId}" is calculated but has no formula.`);
    }
    const nextVisiting = new Set(visiting).add(statId);
    const node = parseFormula(def.formula);
    const formulaValue = evaluateFormula(node, (path) => {
      const match = /^stats\.([\w-]+)\.(current|modifier)$/.exec(path);
      if (!match) {
        throw new ModifierEngineError(`Unknown identifier "${path}" in formula for stat "${statId}".`);
      }
      const [, refId, accessor] = match;
      const resolved = resolveStat(character, ruleset, refId!, nextVisiting);
      return accessor === "modifier" ? abilityModifier(resolved.value) : resolved.value;
    });
    const { value, trace } = applyStatModifiers(character, ruleset, statId, formulaValue, `Base (${def.formula})`);
    return { statId, value, base: formulaValue, isOverridden: false, trace };
  }

  const base = stat ? stat.current : (def.defaultValue ?? 0);
  const { value, trace } = applyStatModifiers(character, ruleset, statId, base, def.name);
  return { statId, value, base, max: stat?.max, isOverridden: false, trace };
}

export function resolveAllStats(character: Character, ruleset: Ruleset): Record<string, ResolvedStat> {
  const result: Record<string, ResolvedStat> = {};
  for (const def of ruleset.statDefinitions) {
    result[def.id] = resolveStat(character, ruleset, def.id);
  }
  return result;
}
