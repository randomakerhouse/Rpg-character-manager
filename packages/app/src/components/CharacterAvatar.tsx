import type { CSSProperties } from "react";

interface CharacterAvatarProps {
  imageUrl?: string;
  name: string;
  size?: number;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function CharacterAvatar({ imageUrl, name, size = 44 }: CharacterAvatarProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    background: "var(--color-primary)",
    color: "var(--color-primary-contrast)",
    fontWeight: 700,
    fontSize: size * 0.4,
  };

  if (imageUrl) {
    return (
      <div style={style}>
        <img src={imageUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }

  return <div style={style}>{initialsOf(name)}</div>;
}
