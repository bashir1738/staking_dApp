"use client";

interface Props {
  isPaused: boolean;
  emergencyMode: boolean;
  onPause: () => Promise<void>;
  onUnpause: () => Promise<void>;
  onSetEmergencyMode: (enabled: boolean) => Promise<void>;
  isDisabled: boolean;
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
  active?: boolean;
}

function ActionButton({ label, onClick, disabled, danger, active }: ActionButtonProps) {
  const base = danger
    ? { bg: active ? "#2a0a0a" : "#1a0808", border: active ? "#7a1a1a" : "#3a1515", color: "#fca5a5" }
    : { bg: active ? "#0a1a0a" : "#0a1208", border: active ? "#1a5a1a" : "#152a15", color: "#86efac" };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      style={{ background: base.bg, border: `1px solid ${base.border}`, color: base.color }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.opacity = "0.8"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      {label}
    </button>
  );
}

export function AdminPanel({ isPaused, emergencyMode, onPause, onUnpause, onSetEmergencyMode, isDisabled }: Props) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--surface)", border: "1px solid #2a2a1a" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
          style={{ background: "#1a1a08", border: "1px solid #3a3a15", color: "#d4d48a" }}
        >
          Owner Controls
        </span>
      </div>

      {/* Status row */}
      <div className="flex gap-3 mb-4">
        <div
          className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-xs"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <span style={{ color: "var(--text-3)" }}>Contract</span>
          <span style={{ color: isPaused ? "#fbbf24" : "#4ade80", fontWeight: 600 }}>
            {isPaused ? "Paused" : "Active"}
          </span>
        </div>
        <div
          className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-xs"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <span style={{ color: "var(--text-3)" }}>Emergency</span>
          <span style={{ color: emergencyMode ? "#fca5a5" : "#4ade80", fontWeight: 600 }}>
            {emergencyMode ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      {/* Pause controls */}
      <p className="text-xs mb-2" style={{ color: "var(--text-3)" }}>Pause system</p>
      <div className="flex gap-2 mb-4">
        <ActionButton
          label="Pause"
          onClick={onPause}
          disabled={isDisabled || isPaused}
          danger
          active={isPaused}
        />
        <ActionButton
          label="Unpause"
          onClick={onUnpause}
          disabled={isDisabled || !isPaused}
          active={!isPaused}
        />
      </div>

      {/* Emergency controls */}
      <p className="text-xs mb-2" style={{ color: "var(--text-3)" }}>Emergency mode</p>
      <div className="flex gap-2">
        <ActionButton
          label="Enable Emergency"
          onClick={() => onSetEmergencyMode(true)}
          disabled={isDisabled || emergencyMode}
          danger
          active={emergencyMode}
        />
        <ActionButton
          label="Disable Emergency"
          onClick={() => onSetEmergencyMode(false)}
          disabled={isDisabled || !emergencyMode}
          active={!emergencyMode}
        />
      </div>

      <p className="text-xs mt-3" style={{ color: "var(--text-3)" }}>
        Only visible to the contract owner.
      </p>
    </div>
  );
}
