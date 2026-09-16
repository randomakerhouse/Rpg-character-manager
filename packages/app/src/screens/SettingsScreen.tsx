import { useNavigate } from "react-router-dom";
import { exportCharacter } from "@rpg/persistence";
import { useCharacterContext } from "../state/CharacterContext.js";
import { useAppStore } from "../state/appStore.js";
import ImagePicker from "../components/ImagePicker.js";

export default function SettingsScreen() {
  const { character } = useCharacterContext();
  const deleteCharacter = useAppStore((s) => s.deleteCharacter);
  const saveCharacter = useAppStore((s) => s.saveCharacter);
  const navigate = useNavigate();

  async function handleImageChange(imageUrl: string | undefined) {
    await saveCharacter({ ...character, imageUrl });
  }

  function handleExport() {
    const file = exportCharacter(character);
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${character.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "character"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${character.name}"? This can't be undone.`)) return;
    await deleteCharacter(character.id);
    navigate("/");
  }

  return (
    <div className="stack">
      <div className="card">
        <h3>Character Image</h3>
        <ImagePicker imageUrl={character.imageUrl} name={character.name} onChange={handleImageChange} />
      </div>

      <div className="card">
        <h3>Export</h3>
        <p className="hint">Save this character as a JSON file you can back up or share.</p>
        <button className="button button-primary" onClick={handleExport}>
          Export Character
        </button>
      </div>

      <div className="card">
        <h3>Danger Zone</h3>
        <p className="hint">Permanently delete this character and its history.</p>
        <button className="button button-danger" onClick={handleDelete}>
          Delete Character
        </button>
      </div>
    </div>
  );
}
