import type { CalculationTrace } from "@rpg/engine";

/** Renders a full calculation trace so no number is ever "magic" (section 13/26). */
export default function TraceView({ trace }: { trace: CalculationTrace }) {
  return (
    <div className="trace">
      {trace.steps.map((step, i) => (
        <div className="trace-step" key={i}>
          <span>{step.label}</span>
          <span>
            {step.before !== step.after ? `${round(step.before)} → ${round(step.after)}` : round(step.after)}
          </span>
        </div>
      ))}
      <div className="trace-step">
        <span>Final</span>
        <span>{round(trace.finalValue)}</span>
      </div>
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
