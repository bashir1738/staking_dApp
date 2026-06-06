"use client";

import { formatETH, formatDuration, getAPRLabel, lockTimeRemaining } from "@/lib/utils";
import type { StakeInfo } from "@/hooks/useStaking";

interface Props {
  stake: StakeInfo;
  onClaim: (index: number) => Promise<void>;
  onUnstake: (index: number) => Promise<void>;
  onEmergencyWithdraw: (index: number) => Promise<void>;
  isDisabled: boolean;
  emergencyMode: boolean;
  isPaused: boolean;
}

export function StakeCard({ stake, onClaim, onUnstake, onEmergencyWithdraw, isDisabled, emergencyMode, isPaused }: Props) {
  const apr       = getAPRLabel(stake.amount);
  const duration  = formatDuration(stake.startTime);
  const remaining = lockTimeRemaining(stake.startTime);
  const isLocked  = !!remaining;

  // Normal actions are blocked when paused (unless emergency mode allows emergency exit)
  const normalActionsBlocked = isPaused && !emergencyMode;

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--surface)", border: `1px solid ${emergencyMode ? "#3a1a1a" : "var(--border)"}` }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold num" style={{ color: "var(--text)" }}>
              {formatETH(stake.amount)}
            </span>
            <span className="text-base" style={{ color: "var(--text-2)" }}>ETH</span>
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>
            Staked {duration} ago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: "var(--surface-3)", color: "var(--text-2)", border: "1px solid var(--border-2)" }}
          >
            {apr} APR
          </span>
          <span
            className="text-xs mono px-2 py-1 rounded-md"
            style={{ background: "var(--surface-2)", color: "var(--text-3)", border: "1px solid var(--border)" }}
          >
            #{stake.index}
          </span>
        </div>
      </div>

      {/* Reward row */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-lg mb-3"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Accrued rewards</p>
        <div className="flex items-baseline gap-1.5">
          <span className="font-semibold num" style={{ color: stake.pendingReward > 0n ? "var(--text)" : "var(--text-3)" }}>
            {formatETH(stake.pendingReward, 6)}
          </span>
          <span className="text-sm" style={{ color: "var(--text-3)" }}>ETH</span>
        </div>
      </div>

      {/* Lock / paused / emergency status */}
      {emergencyMode ? (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-sm"
          style={{ background: "#180808", border: "1px solid #4a1515", color: "#fca5a5" }}
        >
          <span className="flex-shrink-0">!</span>
          <span>Emergency mode — withdraw principal now, no rewards paid</span>
        </div>
      ) : isPaused ? (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-sm"
          style={{ background: "#111008", border: "1px solid #2a2208", color: "var(--amber)" }}
        >
          <span className="flex-shrink-0">⏸</span>
          <span>Contract paused — all actions disabled</span>
        </div>
      ) : isLocked ? (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-sm"
          style={{ background: "#111008", border: "1px solid #2a2208", color: "var(--amber)" }}
        >
          <span className="flex-shrink-0">⚠</span>
          <span>Locked {remaining} remaining · 10% penalty applies</span>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-sm"
          style={{ background: "#081208", border: "1px solid #0e2a0e", color: "var(--green)" }}
        >
          <span className="flex-shrink-0">✓</span>
          <span>Lock period complete — withdraw any time</span>
        </div>
      )}

      {/* Actions */}
      {emergencyMode ? (
        <button
          onClick={() => onEmergencyWithdraw(stake.index)}
          disabled={isDisabled}
          className="w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          style={{ background: "#2a0a0a", border: "1px solid #5a1a1a", color: "#fca5a5" }}
          onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.borderColor = "#7a2a2a"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#5a1a1a"; }}
        >
          Emergency Withdraw (principal only)
        </button>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={() => onClaim(stake.index)}
            disabled={isDisabled || normalActionsBlocked || stake.pendingReward === 0n}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-2)", color: "var(--text)" }}
            onMouseEnter={(e) => { if (!isDisabled && !normalActionsBlocked) e.currentTarget.style.borderColor = "var(--border-3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-2)"; }}
          >
            Claim Rewards
          </button>
          <button
            onClick={() => onUnstake(stake.index)}
            disabled={isDisabled || normalActionsBlocked}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{
              background: isLocked ? "#180c0c" : "var(--surface-2)",
              border: `1px solid ${isLocked ? "#3a1a1a" : "var(--border-2)"}`,
              color: isLocked ? "#fca5a5" : "var(--text)",
            }}
            onMouseEnter={(e) => {
              if (!isDisabled && !normalActionsBlocked) e.currentTarget.style.borderColor = isLocked ? "#5a2a2a" : "var(--border-3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = isLocked ? "#3a1a1a" : "var(--border-2)";
            }}
          >
            {isLocked ? "Unstake (−10%)" : "Unstake"}
          </button>
        </div>
      )}
    </div>
  );
}
