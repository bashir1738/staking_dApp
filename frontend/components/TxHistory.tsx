"use client";

import type { TxHistoryItem } from "@/hooks/useStaking";

interface Props { items: TxHistoryItem[] }

const LABELS: Record<TxHistoryItem["type"], string> = {
  staked:      "Staked",
  claimed:     "Claimed",
  unstaked:    "Unstaked",
  emergency:   "Emergency",
  transferred: "Transferred",
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function TxHistory({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-3)" }}>
        Transaction History
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        {items.map((item, i) => (
          <div
            key={item.hash}
            className="flex items-center justify-between px-4 py-3"
            style={{
              background: i % 2 === 0 ? "var(--surface)" : "var(--bg)",
              borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            {/* Left */}
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{
                  background: "var(--surface-3)",
                  color: item.type === "staked" ? "var(--text)" : "var(--text-2)",
                  border: "1px solid var(--border-2)",
                  minWidth: "64px",
                  textAlign: "center",
                }}
              >
                {LABELS[item.type]}
              </span>
              {item.amountEth !== "0" && (
                <span className="text-sm font-medium num" style={{ color: "var(--text)" }}>
                  {item.amountEth} ETH
                </span>
              )}
              {item.stakeIndex !== undefined && (
                <span className="text-xs mono" style={{ color: "var(--text-3)" }}>#{item.stakeIndex}</span>
              )}
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
              <span className="text-xs" style={{ color: "var(--text-3)" }}>
                {timeAgo(item.timestamp)}
              </span>
              <a
                href={`https://sepolia.etherscan.io/tx/${item.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs mono flex items-center gap-1 transition-colors"
                style={{ color: "var(--text-3)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; }}
              >
                {item.hash.slice(0, 8)}…{item.hash.slice(-6)}
                <span style={{ fontSize: "10px" }}>↗</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
