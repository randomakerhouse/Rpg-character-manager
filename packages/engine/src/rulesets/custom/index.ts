import type { Ruleset } from "../../model/ruleset.js";
import { PIPELINE_STAGES } from "../../model/effect.js";

/**
 * Minimal starting point for a fully custom ruleset (section 21). The player
 * extends this through the UI — it deliberately ships with just enough to be usable.
 */
export function createStarterCustomRuleset(id: string, name: string): Ruleset {
  return {
    id,
    name,
    schemaVersion: 1,
    statDefinitions: [{ id: "hp", name: "Hit Points", valueType: "currentMax", defaultValue: 10 }],
    damageTypes: [{ id: "physical", name: "Physical" }],
    resourceDefinitions: [],
    conditionDefinitions: [],
    itemCategories: [
      { id: "weapons", name: "Weapons" },
      { id: "consumables", name: "Consumables" },
      { id: "custom", name: "Custom" },
    ],
    pipelineStages: [...PIPELINE_STAGES],
    rollConfig: { defaultRollMode: "normal" },
  };
}
