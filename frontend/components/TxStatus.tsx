"use client";

import type { TxState } from "@/hooks/useStaking";

interface Props {
  txState: TxState;
  onDismiss: () => void;
}

const CFG = {
  idle:      null,
  signing:   { dot: "#9e9e9e", label: "Waiting for signature…", spin: true  },
  pending:   { dot: "#fbbf24", label: "Transaction pending…",   spin: true  },
  confirmed: { dot: "#4ade80", label: "Confirmed",              spin: false },
  error:     { dot: "#f87171", label: "",                       spin: false },
} as const;

export function TxStatus({ txState, onDismiss }: Props) {
  if (txState.status === "idle") return null;
  const cfg = CFG[txState.status];
  if (!cfg) return null;

  const label = txState.status === "error" ? txState.message : cfg.label;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl max-w-xs w-full"
      style={{ background: "var(--surface-3)", border: "1px solid var(--border-2)" }}
    >
      {/* Indicator */}
      <div className="mt-0.5 flex-shrink-0">
        {cfg.spin ? (
          <div
            className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${cfg.dot} transparent ${cfg.dot} ${cfg.dot}` }}
          />
        ) : (
          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: cfg.dot }}>
            <span style={{ fontSize: "9px", color: "#000" }}>
              {txState.status === "confirmed" ? "✓" : "✕"}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{label}</p>
        {txState.hash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${txState.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs mono mt-0.5 block truncate transition-colors"
            style={{ color: "var(--text-3)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; }}
          >
            {txState.hash.slice(0, 14)}…{txState.hash.slice(-10)} ↗
          </a>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="text-sm cursor-pointer flex-shrink-0 transition-colors"
        style={{ color: "var(--text-3)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-2)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; }}
      >
        ×
      </button>
    </div>
  );
}
