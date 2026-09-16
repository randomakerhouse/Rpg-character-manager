import type { Effect, PipelineStage } from "../model/effect.js";
import type { CalculationTrace, TraceStep } from "../model/transaction.js";
import type { EventContext } from "../events/context.js";
import { resolveField } from "../events/context.js";
import type { RandomFn } from "../dice/index.js";
import { evaluateDiceExpression, parseDiceFormula } from "../dice/index.js";
import { resolveValueExpr } from "./valueResolver.js";
import type { TriggerableEntry } from "./matcher.js";

export interface SideEffect {
  entryId: string;
  entryName: string;
  effect: Effect;
}

export interface PipelineResult {
  trace: CalculationTrace;
  sideEffects: SideEffect[];
}

type PipelineEffect = Extract<Effect, { stage: PipelineStage }>;

interface FlatEffect {
  entryId: string;
  entryName: string;
  priority: number;
  effect: PipelineEffect;
}

const RESISTANCE_MULTIPLIER: Record<"grantResistance" | "grantVulnerability" | "grantImmunity", number> = {
  grantResistance: 0.5,
  grantVulnerability: 2,
  grantImmunity: 0,
};

function isPipelineStageEffect(
  effect: Effect,
): effect is Extract<Effect, { stage: PipelineStage }> {
  return "stage" in effect;
}

function describeValue(resolved: { value: number; diceBreakdown?: string }): string {
  return resolved.diceBreakdown ?? String(resolved.value);
}

function applyNumericEffect(
  before: number,
  entry: FlatEffect,
  effect: Extract<Effect, { op: "add" | "subtract" | "multiply" | "divide" | "set" | "min" | "max" }>,
  context: EventContext,
  rng: RandomFn | undefined,
): TraceStep {
  const resolved = resolveValueExpr(effect.value, context, rng);
  let after: number;
  let verb: string;

  switch (effect.op) {
    case "add":
      after = before + resolved.value;
      verb = "+";
      break;
    case "subtract":
      after = before - resolved.value;
      verb = "-";
      break;
    case "multiply":
      after = before * resolved.value;
      verb = "×";
      break;
    case "divide":
      after = before / resolved.value;
      verb = "÷";
      break;
    case "set":
      after = resolved.value;
      verb = "=";
      break;
    case "min":
      after = Math.max(before, resolved.value);
      verb = "min";
      break;
    case "max":
      after = Math.min(before, resolved.value);
      verb = "max";
      break;
  }

  return {
    label: `${entry.entryName}: ${verb} ${describeValue(resolved)}`,
    before,
    after,
  };
}

/**
 * Executes the modifier pipeline over an already-selected set of effects (AUTO effects plus
 * any PROMPT/MANUAL ones the player accepted). Buckets effects by ruleset-defined stage order,
 * applies them, and produces a full CalculationTrace so nothing is a "magic" number.
 */
export function runPipeline(input: {
  baseValue: number;
  baseLabel?: string;
  context: EventContext;
  entries: TriggerableEntry[];
  pipelineStages: PipelineStage[];
  rng?: RandomFn;
}): PipelineResult {
  const { baseValue, baseLabel = "Base value", context, entries, pipelineStages, rng } = input;

  const flatEffects: FlatEffect[] = [];
  const sideEffects: SideEffect[] = [];

  for (const entry of entries) {
    for (const effect of entry.effects) {
      if (isPipelineStageEffect(effect)) {
        flatEffects.push({ entryId: entry.id, entryName: entry.name, priority: entry.priority, effect });
      } else {
        sideEffects.push({ entryId: entry.id, entryName: entry.name, effect });
      }
    }
  }

  const steps: TraceStep[] = [];
  let workingValue = baseValue;
  steps.push({ label: baseLabel, before: baseValue, after: baseValue });

  for (const stage of pipelineStages) {
    const stageEffects = flatEffects
      .filter((f) => f.effect.stage === stage)
      .sort((a, b) => a.priority - b.priority);

    const before = workingValue;

    for (const flat of stageEffects) {
      const { effect } = flat;

      switch (effect.op) {
        case "addDice": {
          const beforeStep = workingValue;
          const evaluation = evaluateDiceExpression(parseDiceFormula(effect.dice), rng);
          workingValue = beforeStep + evaluation.total;
          steps.push({
            label: `${flat.entryName}: + ${effect.dice} (${evaluation.total})`,
            before: beforeStep,
            after: workingValue,
          });
          continue;
        }

        case "grantResistance":
        case "grantVulnerability":
        case "grantImmunity": {
          const damageType = resolveField(context, "damage.type");
          if (damageType !== effect.damageType) continue;
          const beforeStep = workingValue;
          workingValue = beforeStep * RESISTANCE_MULTIPLIER[effect.op];
          const label =
            effect.op === "grantImmunity"
              ? `${flat.entryName}: Immune to ${effect.damageType}`
              : `${flat.entryName}: ${effect.op === "grantResistance" ? "Resistance" : "Vulnerability"} to ${effect.damageType}`;
          steps.push({ label, before: beforeStep, after: workingValue });
          continue;
        }

        default: {
          const step = applyNumericEffect(workingValue, flat, effect, context, rng);
          steps.push(step);
          workingValue = step.after;
        }
      }
    }

    if (stage === "resistance" && workingValue !== before) {
      const floored = Math.floor(workingValue);
      if (floored !== workingValue) {
        steps.push({ label: "Round down", before: workingValue, after: floored });
        workingValue = floored;
      }
    }
  }

  return {
    trace: { steps, finalValue: workingValue },
    sideEffects,
  };
}
