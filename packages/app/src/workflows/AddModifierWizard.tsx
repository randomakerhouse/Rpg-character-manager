import { useState } from "react";
import type { ActivationMode, Modifier, ModifierSourceRef, Ruleset } from "@rpg/engine";
import { CORE_EVENTS, generateId, leaf, literal, statCalculatedTrigger } from "@rpg/engine";

interface Template {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

const TEMPLATES: Template[] = [
  { id: "reduceDamage", emoji: "\u{1F6E1}", label: "Reduce incoming damage", description: "Subtract a flat amount from damage you take." },
  { id: "resistance", emoji: "\u{1F6E1}", label: "Resistance to damage type", description: "Halve damage of one type." },
  { id: "immunity", emoji: "\u{1F6AB}", label: "Immunity to damage type", description: "Take no damage of one type." },
  { id: "vulnerability", emoji: "\u{1FA78}", label: "Vulnerability to damage type", description: "Double damage of one type." },
  { id: "addAttackDamage", emoji: "⚔️", label: "Add damage to attacks", description: "Add bonus dice when you hit with a weapon." },
  { id: "attackBonus", emoji: "\u{1F3AF}", label: "Bonus to attack roll", description: "Add or subtract from your attack rolls." },
  { id: "modifyStat", emoji: "✨", label: "Modify a statistic", description: "Add or subtract from any stat, like AC or Speed." },
  { id: "healingBonus", emoji: "❤️", label: "Healing bonus", description: "Add extra healing when you're healed." },
  { id: "reminder", emoji: "\u{1F514}", label: "Reminder", description: "Just remind me — I'll decide what to do." },
];

interface AddModifierWizardProps {
  ruleset: Ruleset;
  sourceRef: ModifierSourceRef;
  onCreate: (modifier: Modifier) => void;
  onCancel: () => void;
}

/** No-code modifier creation (section 37): pick what it does, answer 2-4 plain questions, done. */
export default function AddModifierWizard({ ruleset, sourceRef, onCreate, onCancel }: AddModifierWizardProps) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [damageScope, setDamageScope] = useState<"all" | "specific">("specific");
  const [damageType, setDamageType] = useState(ruleset.damageTypes[0]?.id ?? "");
  const [amount, setAmount] = useState(1);
  const [diceFormula, setDiceFormula] = useState("1d6");
  const [statId, setStatId] = useState(ruleset.statDefinitions[0]?.id ?? "");
  const [activation, setActivation] = useState<ActivationMode>("AUTO");
  const [reminderTrigger, setReminderTrigger] = useState<"attack" | "damage">("attack");

  const template = TEMPLATES.find((t) => t.id === templateId);

  function base(humanReadableSummary: string, trigger: string): Omit<Modifier, "conditions" | "effects"> {
    return {
      id: generateId(),
      name: name.trim() || template?.label || "Modifier",
      humanReadableSummary,
      sourceRef,
      trigger,
      activationMode: activation,
      priority: 0,
      enabled: true,
    };
  }

  function create() {
    if (!templateId) return;
    let modifier: Modifier | null = null;
    const dtName = ruleset.damageTypes.find((d) => d.id === damageType)?.name ?? damageType;

    switch (templateId) {
      case "reduceDamage":
        modifier = {
          ...base(
            `When you receive ${damageScope === "all" ? "any" : dtName} damage, reduce it by ${amount}.`,
            CORE_EVENTS.beforeDamageReceived,
          ),
          conditions: damageScope === "specific" ? leaf("damage.type", "eq", damageType) : null,
          effects: [{ op: "subtract", stage: "flatReduction", target: "workingValue", value: literal(amount) }],
        };
        break;
      case "resistance":
        modifier = {
          ...base(`Resistance to ${dtName} damage.`, CORE_EVENTS.beforeDamageReceived),
          conditions: null,
          effects: [{ op: "grantResistance", stage: "resistance", damageType }],
        };
        break;
      case "immunity":
        modifier = {
          ...base(`Immune to ${dtName} damage.`, CORE_EVENTS.beforeDamageReceived),
          conditions: null,
          effects: [{ op: "grantImmunity", stage: "resistance", damageType }],
        };
        break;
      case "vulnerability":
        modifier = {
          ...base(`Vulnerable to ${dtName} damage.`, CORE_EVENTS.beforeDamageReceived),
          conditions: null,
          effects: [{ op: "grantVulnerability", stage: "resistance", damageType }],
        };
        break;
      case "addAttackDamage":
        modifier = {
          ...base(`When you hit with a weapon, you may add ${diceFormula} ${dtName} damage.`, CORE_EVENTS.onWeaponHit),
          conditions: null,
          effects: [{ op: "addDice", stage: "additive", target: "workingValue", dice: diceFormula, damageType }],
        };
        break;
      case "attackBonus":
        modifier = {
          ...base(`${amount >= 0 ? "+" : ""}${amount} to attack rolls.`, CORE_EVENTS.attackRoll),
          conditions: null,
          effects: [{ op: "add", stage: "additive", target: "workingValue", value: literal(amount) }],
        };
        break;
      case "modifyStat": {
        const statName = ruleset.statDefinitions.find((s) => s.id === statId)?.name ?? statId;
        modifier = {
          ...base(`${amount >= 0 ? "+" : ""}${amount} to ${statName}.`, statCalculatedTrigger(statId)),
          conditions: null,
          effects: [{ op: "add", stage: "additive", target: "workingValue", value: literal(amount) }],
        };
        break;
      }
      case "healingBonus":
        modifier = {
          ...base(`+${amount} to healing received.`, CORE_EVENTS.healingReceived),
          conditions: null,
          effects: [{ op: "add", stage: "additive", target: "workingValue", value: literal(amount) }],
        };
        break;
      case "reminder":
        modifier = {
          ...base(
            `Reminder: ${name.trim() || "check this"} when you ${reminderTrigger === "attack" ? "attack" : "take damage"}.`,
            reminderTrigger === "attack" ? CORE_EVENTS.onWeaponHit : CORE_EVENTS.beforeDamageReceived,
          ),
          activationMode: "PROMPT",
          conditions: null,
          effects: [],
        };
        break;
    }

    if (modifier) onCreate(modifier);
  }

  if (!template) {
    return (
      <div className="stack">
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button key={t.id} className="template-tile" onClick={() => setTemplateId(t.id)}>
              <span className="emoji">{t.emoji}</span>
              <strong>{t.label}</strong>
              <span className="hint">{t.description}</span>
            </button>
          ))}
        </div>
        <button className="button button-block" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }

  const id = template.id;

  return (
    <div className="stack">
      <p className="hint">{template.description}</p>
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={template.label} autoFocus />
      </div>

      {id === "reduceDamage" && (
        <div className="field">
          <label>Reduce which damage?</label>
          <select value={damageScope} onChange={(e) => setDamageScope(e.target.value as "all" | "specific")}>
            <option value="all">All damage</option>
            <option value="specific">Specific damage type</option>
          </select>
        </div>
      )}

      {(id === "reduceDamage" && damageScope === "specific") ||
      ["resistance", "immunity", "vulnerability", "addAttackDamage"].includes(id) ? (
        <div className="field">
          <label>Damage type</label>
          <select value={damageType} onChange={(e) => setDamageType(e.target.value)}>
            {ruleset.damageTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {["reduceDamage", "attackBonus", "healingBonus", "modifyStat"].includes(id) && (
        <div className="field">
          <label>Amount</label>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
      )}

      {id === "addAttackDamage" && (
        <div className="field">
          <label>Bonus dice</label>
          <input value={diceFormula} onChange={(e) => setDiceFormula(e.target.value)} placeholder="1d6" />
        </div>
      )}

      {id === "modifyStat" && (
        <div className="field">
          <label>Which statistic?</label>
          <select value={statId} onChange={(e) => setStatId(e.target.value)}>
            {ruleset.statDefinitions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {id === "reminder" && (
        <div className="field">
          <label>When?</label>
          <select value={reminderTrigger} onChange={(e) => setReminderTrigger(e.target.value as "attack" | "damage")}>
            <option value="attack">When I attack</option>
            <option value="damage">When I take damage</option>
          </select>
        </div>
      )}

      {id !== "reminder" && id !== "resistance" && id !== "immunity" && id !== "vulnerability" && (
        <div className="field">
          <label>Should the app apply this automatically?</label>
          <select value={activation} onChange={(e) => setActivation(e.target.value as ActivationMode)}>
            <option value="AUTO">Apply automatically</option>
            <option value="PROMPT">Ask me before applying it</option>
            <option value="MANUAL">Only remind me</option>
          </select>
        </div>
      )}

      <div className="row">
        <button className="button" onClick={() => setTemplateId(null)}>
          Back
        </button>
        <button className="button button-primary" onClick={create}>
          Create
        </button>
      </div>
    </div>
  );
}
