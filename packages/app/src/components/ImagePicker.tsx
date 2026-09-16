import { useRef, useState } from "react";
import CharacterAvatar from "./CharacterAvatar.js";
import { fileToResizedDataUrl } from "../lib/imageUtils.js";

interface ImagePickerProps {
  imageUrl?: string;
  name: string;
  onChange: (dataUrl: string | undefined) => void;
}

export default function ImagePicker({ imageUrl, name, onChange }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't use that image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row">
      <CharacterAvatar imageUrl={imageUrl} name={name} size={64} />
      <div className="stack" style={{ flex: 1 }}>
        <div className="row">
          <button type="button" className="button" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Processing…" : imageUrl ? "Change Image" : "Upload Image"}
          </button>
          {imageUrl && (
            <button type="button" className="button" onClick={() => onChange(undefined)}>
              Remove
            </button>
          )}
        </div>
        {error && (
          <span className="hint" style={{ color: "var(--color-danger)" }}>
            {error}
          </span>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
    </div>
  );
}
