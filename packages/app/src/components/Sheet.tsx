import type { ReactNode } from "react";

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Bottom sheet on mobile, centered modal on desktop — used for every guided workflow (take damage, attack, etc.). */
export default function Sheet({ title, onClose, children, footer }: SheetProps) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{title}</h2>
          <button className="button button-ghost" onClick={onClose} aria-label="Close">
            {"✕"}
          </button>
        </div>
        <div className="stack">{children}</div>
        {footer && (
          <div className="row" style={{ marginTop: "var(--space-5)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
