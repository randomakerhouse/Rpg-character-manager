interface ManualOverrideFieldProps {
  calculatedValue: number;
  overrideValue: number | null;
  reason: string;
  onOverrideChange: (value: number | null) => void;
  onReasonChange: (reason: string) => void;
}

/** Lets the player correct an automatic result — the DM's ruling always wins (section 27). */
export default function ManualOverrideField({
  calculatedValue,
  overrideValue,
  reason,
  onOverrideChange,
  onReasonChange,
}: ManualOverrideFieldProps) {
  return (
    <details>
      <summary className="hint" style={{ cursor: "pointer" }}>
        Override the result manually
      </summary>
      <div className="field">
        <label>Override value (calculated: {Math.round(calculatedValue * 100) / 100})</label>
        <input
          type="number"
          value={overrideValue ?? ""}
          placeholder={String(calculatedValue)}
          onChange={(e) => onOverrideChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      </div>
      {overrideValue !== null && (
        <div className="field">
          <label>Reason</label>
          <input value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder="e.g. DM ruling" />
        </div>
      )}
    </details>
  );
}
