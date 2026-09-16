import type { Character, ActiveCondition } from "../model/character.js";
import type { Effect } from "../model/effect.js";
import type { Ruleset } from "../model/ruleset.js";
import type { EventContext } from "../events/context.js";
import { resolveValueExpr } from "../modifiers/valueResolver.js";
import type { SideEffect } from "../modifiers/pipeline.js";
import type { PatchEntry } from "./transactions.js";
import { generateId } from "../util/id.js";

export interface AppliedSideEffects {
  character: Character;
  patch: PatchEntry[];
  descriptions: string[];
}

/**
 * Applies the non-numeric "side effect" ops queued by the modifier pipeline
 * (consumeResource, applyCondition/removeCondition, modifyStat) and records a
 * patch trail so every change is undoable.
 */
export function applySideEffects(
  character: Character,
  ruleset: Ruleset,
  sideEffects: SideEffect[],
  context: EventContext,
): AppliedSideEffects {
  let current = character;
  const patch: PatchEntry[] = [];
  const descriptions: string[] = [];

  for (const { entryName, effect } of sideEffects) {
    const applied = applyOne(current, ruleset, effect, context, entryName);
    if (!applied) continue;
    current = applied.character;
    patch.push(...applied.patch);
    descriptions.push(applied.description);
  }

  return { character: current, patch, descriptions };
}

function applyOne(
  character: Character,
  ruleset: Ruleset,
  effect: Effect,
  context: EventContext,
  entryName: string,
): { character: Character; patch: PatchEntry[]; description: string } | null {
  switch (effect.op) {
    case "consumeResource": {
      const resource = character.resources[effect.resourceId];
      if (!resource) return null;
      const amount = resolveValueExpr(effect.amount, context).value;
      const before = resource.current;
      const after = Math.max(0, before - amount);
      return {
        character: {
          ...character,
          resources: { ...character.resources, [effect.resourceId]: { ...resource, current: after } },
        },
        patch: [{ path: `resources.${effect.resourceId}.current`, before, after }],
        description: `${entryName}: -${amount} ${resource.resourceDefId}`,
      };
    }

    case "modifyStat": {
      const stat = character.stats[effect.statId];
      if (!stat) return null;
      const delta = resolveValueExpr(effect.delta, context).value;
      const before = stat.current;
      const def = ruleset.statDefinitions.find((s) => s.id === effect.statId);
      let after = before + delta;
      if (def?.min !== undefined) after = Math.max(def.min, after);
      if (def?.max !== undefined) after = Math.min(def.max, after);
      return {
        character: {
          ...character,
          stats: { ...character.stats, [effect.statId]: { ...stat, current: after } },
        },
        patch: [{ path: `stats.${effect.statId}.current`, before, after }],
        description: `${entryName}: ${delta >= 0 ? "+" : ""}${delta} ${effect.statId}`,
      };
    }

    case "applyCondition": {
      const def = ruleset.conditionDefinitions.find((c) => c.id === effect.conditionId);
      if (!def) return null;
      const remaining =
        effect.duration?.kind === "rounds" || effect.duration?.kind === "turns"
          ? { kind: effect.duration.kind, amount: effect.duration.amount }
          : def.defaultDuration
            ? { kind: def.defaultDuration.kind, amount: def.defaultDuration.amount }
            : undefined;

      const newActive: ActiveCondition = {
        id: generateId(),
        conditionDefId: effect.conditionId,
        remaining,
        modifiers: def.modifiers,
      };

      const before = character.activeConditions;
      const after = [...before, newActive];
      return {
        character: { ...character, activeConditions: after },
        patch: [{ path: "activeConditions", before, after }],
        description: `${entryName}: applied ${def.name}`,
      };
    }

    case "removeCondition": {
      const before = character.activeConditions;
      const after = before.filter((c) => c.conditionDefId !== effect.conditionId);
      if (after.length === before.length) return null;
      return {
        character: { ...character, activeConditions: after },
        patch: [{ path: "activeConditions", before, after }],
        description: `${entryName}: removed ${effect.conditionId}`,
      };
    }

    default:
      return null;
  }
}
