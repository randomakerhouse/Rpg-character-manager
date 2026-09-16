import { useState } from "react";
import type { ResolvedStat } from "@rpg/engine";
import TraceView from "./TraceView.js";

/** Any computed value the player can click to see exactly how it was calculated (section 13). */
export default function ExplainableStat({ label, resolved }: { label: string; resolved: ResolvedStat }) {
  const [open, setOpen] = useState(false);
  const hasBreakdown = resolved.trace.steps.length > 1;

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <button
        className="button-ghost button"
        style={{ width: "100%", flexDirection: "column", padding: 0, cursor: hasBreakdown ? "pointer" : "default" }}
        onClick={() => hasBreakdown && setOpen((o) => !o)}
      >
        <span className="hint">{label}</span>
        <span style={{ fontSize: "1.6rem", fontWeight: 700 }}>{Math.round(resolved.value * 100) / 100}</span>
      </button>
      {open && <TraceView trace={resolved.trace} />}
    </div>
  );
}
