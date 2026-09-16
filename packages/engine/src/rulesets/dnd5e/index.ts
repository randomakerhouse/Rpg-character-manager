import type { Ruleset } from "../../model/ruleset.js";
import { PIPELINE_STAGES } from "../../model/effect.js";

/**
 * Built-in D&D 5e preset. Just one Ruleset among many the engine can run — nothing
 * downstream of the Ruleset type is D&D-specific.
 */
export const dnd5eRuleset: Ruleset = {
  id: "dnd5e",
  name: "Dungeons & Dragons 5th Edition",
  schemaVersion: 1,
  statDefinitions: [
    { id: "strength", name: "Strength", valueType: "simple", min: 1, max: 30, defaultValue: 10, derivesModifier: true },
    { id: "dexterity", name: "Dexterity", valueType: "simple", min: 1, max: 30, defaultValue: 10, derivesModifier: true },
    { id: "constitution", name: "Constitution", valueType: "simple", min: 1, max: 30, defaultValue: 10, derivesModifier: true },
    { id: "intelligence", name: "Intelligence", valueType: "simple", min: 1, max: 30, defaultValue: 10, derivesModifier: true },
    { id: "wisdom", name: "Wisdom", valueType: "simple", min: 1, max: 30, defaultValue: 10, derivesModifier: true },
    { id: "charisma", name: "Charisma", valueType: "simple", min: 1, max: 30, defaultValue: 10, derivesModifier: true },
    { id: "hp", name: "Hit Points", valueType: "currentMax", defaultValue: 10 },
    { id: "temporaryHp", name: "Temporary HP", valueType: "simple", defaultValue: 0, min: 0 },
    { id: "speed", name: "Speed", valueType: "simple", defaultValue: 30 },
    { id: "proficiencyBonus", name: "Proficiency Bonus", valueType: "simple", defaultValue: 2 },
    { id: "armorClass", name: "Armor Class", valueType: "calculated", formula: "10 + stats.dexterity.modifier" },
    { id: "initiative", name: "Initiative", valueType: "calculated", formula: "stats.dexterity.modifier" },
    {
      id: "passivePerception",
      name: "Passive Perception",
      valueType: "calculated",
      formula: "10 + stats.wisdom.modifier",
    },
  ],
  damageTypes: [
    { id: "slashing", name: "Slashing" },
    { id: "piercing", name: "Piercing" },
    { id: "bludgeoning", name: "Bludgeoning" },
    { id: "fire", name: "Fire", color: "#e2652b" },
    { id: "cold", name: "Cold", color: "#5ab4e0" },
    { id: "lightning", name: "Lightning", color: "#e0d23a" },
    { id: "acid", name: "Acid", color: "#8bc24a" },
    { id: "poison", name: "Poison", color: "#7b4fa6" },
    { id: "necrotic", name: "Necrotic", color: "#4a4a55" },
    { id: "radiant", name: "Radiant", color: "#f4e28c" },
    { id: "psychic", name: "Psychic", color: "#e06bb0" },
    { id: "thunder", name: "Thunder", color: "#8c8c9e" },
    { id: "force", name: "Force", color: "#c9a7f0" },
  ],
  resourceDefinitions: [{ id: "inspiration", name: "Inspiration", max: 1 }],
  conditionDefinitions: [
    { id: "poisoned", name: "Poisoned", description: "Disadvantage on attack rolls and ability checks.", modifiers: [] },
    { id: "stunned", name: "Stunned", description: "Can't take actions or reactions.", modifiers: [] },
    { id: "prone", name: "Prone", description: "Movement and attack disadvantages apply.", modifiers: [] },
    { id: "frightened", name: "Frightened", description: "Disadvantage while the source is in sight.", modifiers: [] },
    { id: "restrained", name: "Restrained", description: "Speed 0; disadvantage on Dexterity saves.", modifiers: [] },
    { id: "invisible", name: "Invisible", description: "Advantage on attack rolls against foes who can't see you.", modifiers: [] },
    { id: "blessed", name: "Blessed", description: "Add a bonus to attack rolls and saving throws.", modifiers: [] },
  ],
  itemCategories: [
    { id: "weapons", name: "Weapons" },
    { id: "armor", name: "Armor" },
    { id: "consumables", name: "Consumables" },
    { id: "magicItems", name: "Magic Items" },
    { id: "questItems", name: "Quest Items" },
    { id: "materials", name: "Materials" },
    { id: "custom", name: "Custom" },
  ],
  pipelineStages: [...PIPELINE_STAGES],
  rollConfig: {
    defaultRollMode: "normal",
    criticalRule: { onNatural: 20, effect: "doubleDice" },
  },
};
