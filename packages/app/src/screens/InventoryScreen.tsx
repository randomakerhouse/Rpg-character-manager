import { useState } from "react";
import type { DamageComponent, InventoryItem, Modifier, Weapon } from "@rpg/engine";
import { buildTransaction, generateId, toggleEquipped } from "@rpg/engine";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";
import Sheet from "../components/Sheet.js";
import AddModifierWizard from "../workflows/AddModifierWizard.js";

export default function InventoryScreen() {
  const { character, ruleset } = useCharacterContext();
  const applyUpdate = useAppStore((s) => s.applyUpdate);
  const [addingWeapon, setAddingWeapon] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [modifierTargetWeapon, setModifierTargetWeapon] = useState<string | null>(null);
  const [modifierTargetItem, setModifierTargetItem] = useState<string | null>(null);

  async function toggle(kind: "weapon" | "item", id: string) {
    const { character: updated, transaction } = toggleEquipped(character, kind, id);
    await applyUpdate(updated, transaction);
  }

  async function removeWeapon(id: string) {
    const before = character.weapons;
    const after = before.filter((w) => w.id !== id);
    const transaction = buildTransaction({ characterId: character.id, type: "weapon_removed", summary: "Removed weapon", patch: [{ path: "weapons", before, after }] });
    await applyUpdate({ ...character, weapons: after }, transaction);
  }

  async function removeItem(id: string) {
    const before = character.items;
    const after = before.filter((i) => i.id !== id);
    const transaction = buildTransaction({ characterId: character.id, type: "item_removed", summary: "Removed item", patch: [{ path: "items", before, after }] });
    await applyUpdate({ ...character, items: after }, transaction);
  }

  async function addModifierToWeapon(weaponId: string, modifier: Modifier) {
    const weapons = character.weapons.map((w) => (w.id === weaponId ? { ...w, modifiers: [...w.modifiers, { ...modifier, sourceRef: { kind: "weapon" as const, weaponId } }] } : w));
    const transaction = buildTransaction({ characterId: character.id, type: "modifier_added", summary: `Added modifier "${modifier.name}"`, patch: [{ path: "weapons", before: character.weapons, after: weapons }] });
    await applyUpdate({ ...character, weapons }, transaction);
    setModifierTargetWeapon(null);
  }

  async function addModifierToItem(itemId: string, modifier: Modifier) {
    const items = character.items.map((i) => (i.id === itemId ? { ...i, modifiers: [...i.modifiers, { ...modifier, sourceRef: { kind: "item" as const, itemId } }] } : i));
    const transaction = buildTransaction({ characterId: character.id, type: "modifier_added", summary: `Added modifier "${modifier.name}"`, patch: [{ path: "items", before: character.items, after: items }] });
    await applyUpdate({ ...character, items }, transaction);
    setModifierTargetItem(null);
  }

  return (
    <div className="stack">
      <h3>Weapons</h3>
      {character.weapons.length === 0 && <p className="empty-state card">No weapons yet.</p>}
      {character.weapons.map((w) => (
        <div className="card" key={w.id}>
          <div className="row">
            <h3 style={{ margin: 0 }}>{w.name}</h3>
            <label className="toggle-row">
              <input type="checkbox" checked={w.equipped} onChange={() => toggle("weapon", w.id)} />
              Equipped
            </label>
          </div>
          <p className="hint">
            {w.damageComponents.map((dc) => `${dc.dice}${dc.bonus ? `+${dc.bonus}` : ""} ${dc.damageType}`).join(" + ")}
          </p>
          {w.modifiers.length > 0 && (
            <div className="tag-list">
              {w.modifiers.map((m) => (
                <span className="badge" key={m.id}>
                  {m.name}
                </span>
              ))}
            </div>
          )}
          <div className="row">
            <button className="link-button" onClick={() => setModifierTargetWeapon(w.id)}>
              + Add Modifier
            </button>
            <button className="link-button" onClick={() => removeWeapon(w.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button className="button button-block" onClick={() => setAddingWeapon(true)}>
        + Add Weapon
      </button>

      <h3>Items</h3>
      {character.items.length === 0 && <p className="empty-state card">No items yet.</p>}
      {character.items.map((it) => (
        <div className="card" key={it.id}>
          <div className="row">
            <h3 style={{ margin: 0 }}>
              {it.name} {it.quantity > 1 ? `×${it.quantity}` : ""}
            </h3>
            <label className="toggle-row">
              <input type="checkbox" checked={it.equipped} onChange={() => toggle("item", it.id)} />
              Equipped
            </label>
          </div>
          <p className="hint">{ruleset.itemCategories.find((c) => c.id === it.categoryId)?.name ?? it.categoryId}</p>
          {it.modifiers.length > 0 && (
            <div className="tag-list">
              {it.modifiers.map((m) => (
                <span className="badge" key={m.id}>
                  {m.name}
                </span>
              ))}
            </div>
          )}
          <div className="row">
            <button className="link-button" onClick={() => setModifierTargetItem(it.id)}>
              + Add Modifier
            </button>
            <button className="link-button" onClick={() => removeItem(it.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button className="button button-block" onClick={() => setAddingItem(true)}>
        + Add Item
      </button>

      {addingWeapon && (
        <Sheet title="New Weapon" onClose={() => setAddingWeapon(false)}>
          <AddWeaponForm
            onCancel={() => setAddingWeapon(false)}
            onSave={async (weapon) => {
              const after = [...character.weapons, weapon];
              const transaction = buildTransaction({ characterId: character.id, type: "weapon_added", summary: `Added weapon: ${weapon.name}`, patch: [{ path: "weapons", before: character.weapons, after }] });
              await applyUpdate({ ...character, weapons: after }, transaction);
              setAddingWeapon(false);
            }}
          />
        </Sheet>
      )}

      {addingItem && (
        <Sheet title="New Item" onClose={() => setAddingItem(false)}>
          <AddItemForm
            onCancel={() => setAddingItem(false)}
            onSave={async (item) => {
              const after = [...character.items, item];
              const transaction = buildTransaction({ characterId: character.id, type: "item_added", summary: `Added item: ${item.name}`, patch: [{ path: "items", before: character.items, after }] });
              await applyUpdate({ ...character, items: after }, transaction);
              setAddingItem(false);
            }}
          />
        </Sheet>
      )}

      {modifierTargetWeapon && (
        <Sheet title="Add Modifier" onClose={() => setModifierTargetWeapon(null)}>
          <AddModifierWizard
            ruleset={ruleset}
            sourceRef={{ kind: "weapon", weaponId: modifierTargetWeapon }}
            onCancel={() => setModifierTargetWeapon(null)}
            onCreate={(m) => addModifierToWeapon(modifierTargetWeapon, m)}
          />
        </Sheet>
      )}

      {modifierTargetItem && (
        <Sheet title="Add Modifier" onClose={() => setModifierTargetItem(null)}>
          <AddModifierWizard
            ruleset={ruleset}
            sourceRef={{ kind: "item", itemId: modifierTargetItem }}
            onCancel={() => setModifierTargetItem(null)}
            onCreate={(m) => addModifierToItem(modifierTargetItem, m)}
          />
        </Sheet>
      )}
    </div>
  );
}

function AddWeaponForm({ onSave, onCancel }: { onSave: (w: Weapon) => void; onCancel: () => void }) {
  const { ruleset } = useCharacterContext();
  const [name, setName] = useState("");
  const [components, setComponents] = useState<DamageComponent[]>([{ dice: "1d8", damageType: ruleset.damageTypes[0]?.id ?? "" }]);
  const [attackStatId, setAttackStatId] = useState(ruleset.statDefinitions.find((s) => s.derivesModifier)?.id ?? "");
  const [attackBonus, setAttackBonus] = useState(0);
  const [tags, setTags] = useState("");
  const [showMore, setShowMore] = useState(false);

  function updateComponent(i: number, patch: Partial<DamageComponent>) {
    setComponents((prev) => prev.map((c, ci) => (ci === i ? { ...c, ...patch } : c)));
  }

  function save() {
    onSave({
      id: generateId(),
      name: name.trim() || "New Weapon",
      damageComponents: components,
      attackStatId: attackStatId || undefined,
      attackBonus: attackBonus || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      equipped: true,
      modifiers: [],
    });
  }

  return (
    <div className="stack">
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>Damage</label>
        {components.map((c, i) => (
          <div className="row" key={i}>
            <input value={c.dice} onChange={(e) => updateComponent(i, { dice: e.target.value })} placeholder="1d8" style={{ maxWidth: 90 }} />
            <select value={c.damageType} onChange={(e) => updateComponent(i, { damageType: e.target.value })}>
              {ruleset.damageTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.name}
                </option>
              ))}
            </select>
            {components.length > 1 && (
              <button className="link-button" onClick={() => setComponents((prev) => prev.filter((_, ci) => ci !== i))}>
                Remove
              </button>
            )}
          </div>
        ))}
        <button className="link-button" onClick={() => setComponents((prev) => [...prev, { dice: "1d4", damageType: ruleset.damageTypes[0]?.id ?? "" }])}>
          + Add damage component
        </button>
      </div>

      <button className="link-button" onClick={() => setShowMore((s) => !s)} style={{ textAlign: "left" }}>
        {showMore ? "Fewer options" : "More options"}
      </button>

      {showMore && (
        <>
          <div className="field">
            <label>Attack stat</label>
            <select value={attackStatId} onChange={(e) => setAttackStatId(e.target.value)}>
              <option value="">None</option>
              {ruleset.statDefinitions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Attack bonus</label>
            <input type="number" value={attackBonus} onChange={(e) => setAttackBonus(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Tags (comma separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="sword, magical" />
          </div>
        </>
      )}

      <div className="row">
        <button className="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="button button-primary" onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}

function AddItemForm({ onSave, onCancel }: { onSave: (i: InventoryItem) => void; onCancel: () => void }) {
  const { ruleset } = useCharacterContext();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(ruleset.itemCategories[0]?.id ?? "custom");
  const [quantity, setQuantity] = useState(1);

  function save() {
    onSave({
      id: generateId(),
      name: name.trim() || "New Item",
      categoryId,
      quantity,
      equipped: false,
      tags: [],
      modifiers: [],
    });
  }

  return (
    <div className="stack">
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {ruleset.itemCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Quantity</label>
        <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
      </div>
      <div className="row">
        <button className="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="button button-primary" onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}
