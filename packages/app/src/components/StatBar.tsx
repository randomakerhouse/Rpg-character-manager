interface StatBarProps {
  label: string;
  current: number;
  max: number;
  suffix?: string;
}

export default function StatBar({ label, current, max, suffix }: StatBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const ratio = max > 0 ? current / max : 1;
  const fillClass = ratio <= 0.25 ? "hp-critical" : ratio <= 0.5 ? "hp-low" : "";

  return (
    <div>
      <div className="row" style={{ marginBottom: 4 }}>
        <span className="hint">{label}</span>
        <strong>
          {current} / {max}
          {suffix ? ` ${suffix}` : ""}
        </strong>
      </div>
      <div className="bar">
        <div className={`bar-fill ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
