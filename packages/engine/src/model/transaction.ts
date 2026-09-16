import type { Id } from "./common.js";

/** One step of a calculation, shown to the player so nothing is a "magic" number (section 13/26). */
export interface TraceStep {
  label: string;
  before: number;
  after: number;
}

export interface CalculationTrace {
  steps: TraceStep[];
  finalValue: number;
}

export interface ManualOverride {
  calculatedValue: number;
  overriddenValue: number;
  reason: string;
}

export interface Transaction {
  id: Id;
  characterId: Id;
  timestamp: string;
  type: string;
  summary: string;
  trace?: CalculationTrace;
  manualOverride?: ManualOverride;
  /** Minimal patch describing what changed, used to build the inverse for Undo. */
  patch: { path: string; before: unknown; after: unknown }[];
  undone: boolean;
}
