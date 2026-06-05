"use client";

interface Props { onSwitch: () => void }

export function NetworkGuard({ onSwitch }: Props) {
  return (
    <div
      className="flex items-center justify-between px-6 py-3 text-sm"
      style={{ background: "#120a0a", borderBottom: "1px solid #2a1515" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--red)" }} />
        <span style={{ color: "var(--red)" }}>
          Wrong network — please switch to Sepolia
        </span>
      </div>
      <button
        onClick={onSwitch}
        className="px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors"
        style={{ background: "#1e0e0e", border: "1px solid #3a1a1a", color: "#fca5a5" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#2a1212"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#1e0e0e"; }}
      >
        Switch to Sepolia
      </button>
    </div>
  );
}
