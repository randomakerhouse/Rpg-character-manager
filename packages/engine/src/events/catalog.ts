/**
 * Built-in event names. Rulesets may register additional custom event names —
 * this catalog is a starter set, not a closed enum enforced at the type level,
 * so homebrew rulesets aren't locked out of new triggers.
 */
export const CORE_EVENTS = {
  attackStarted: "attack_started",
  attackRoll: "attack_roll",
  attackHit: "attack_hit",
  attackMiss: "attack_miss",
  beforeDamageRoll: "before_damage_roll",
  damageRolled: "damage_rolled",
  beforeDamageReceived: "before_damage_received",
  damageReceived: "damage_received",
  afterDamageReceived: "after_damage_received",
  healingReceived: "healing_received",
  onWeaponHit: "on_weapon_hit",
  spellCast: "spell_cast",
  abilityUsed: "ability_used",
  itemUsed: "item_used",
  itemEquipped: "item_equipped",
  itemUnequipped: "item_unequipped",
  turnStarted: "turn_started",
  turnEnded: "turn_ended",
  conditionAdded: "condition_added",
  conditionRemoved: "condition_removed",
  resourceChanged: "resource_changed",
} as const;

export type CoreEventName = (typeof CORE_EVENTS)[keyof typeof CORE_EVENTS];
