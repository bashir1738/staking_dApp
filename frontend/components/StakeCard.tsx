"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { formatETH, formatDuration, getAPRLabel, lockTimeRemaining } from "@/lib/utils";
import type { StakeInfo } from "@/hooks/useStaking";

interface Props {
  stake: StakeInfo;
  onClaim: (tokenId: bigint) => Promise<void>;
  onUnstake: (tokenId: bigint) => Promise<void>;
  onEmergencyWithdraw: (tokenId: bigint) => Promise<void>;
  onTransfer: (tokenId: bigint, toAddress: string) => Promise<void>;
  isDisabled: boolean;
  emergencyMode: boolean;
  isPaused: boolean;
}

export function StakeCard({
  stake,
  onClaim,
  onUnstake,
  onEmergencyWithdraw,
  onTransfer,
  isDisabled,
  emergencyMode,
  isPaused,
}: Props) {
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferError, setTransferError] = useState("");

  const apr      = getAPRLabel(stake.amount);
  const duration = formatDuration(stake.startTime);
  const remaining = lockTimeRemaining(stake.startTime);
  const isLocked = !!remaining;

  const normalActionsBlocked = isPaused && !emergencyMode;

  function handleTransferConfirm() {
    setTransferError("");
    if (!ethers.isAddress(transferTo)) {
      setTransferError("Invalid address");
      return;
    }
    onTransfer(stake.tokenId, transferTo).then(() => {
      setShowTransfer(false);
      setTransferTo("");
    });
  }

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
          {/* NFT badge */}
          <span
            className="text-xs mono px-2 py-1 rounded-md"
            style={{ background: "#0d0d1a", color: "#818cf8", border: "1px solid #2a2a4a" }}
            title="ERC-721 NFT token ID"
          >
            NFT #{stake.tokenId.toString()}
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

      {/* Status banner */}
      {emergencyMode ? (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-sm"
          style={{ background: "#180808", border: "1px solid #4a1515", color: "#fca5a5" }}
        >
          <span className="shrink-0">!</span>
          <span>Emergency mode — withdraw principal now, no rewards paid</span>
        </div>
      ) : isPaused ? (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-sm"
          style={{ background: "#111008", border: "1px solid #2a2208", color: "var(--amber)" }}
        >
          <span className="shrink-0">⏸</span>
          <span>Contract paused — all actions disabled</span>
        </div>
      ) : isLocked ? (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-sm"
          style={{ background: "#111008", border: "1px solid #2a2208", color: "var(--amber)" }}
        >
          <span className="shrink-0">⚠</span>
          <span>Locked {remaining} remaining · 10% penalty applies</span>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-sm"
          style={{ background: "#081208", border: "1px solid #0e2a0e", color: "var(--green)" }}
        >
          <span className="shrink-0">✓</span>
          <span>Lock period complete — withdraw any time</span>
        </div>
      )}

      {/* Primary actions */}
      {emergencyMode ? (
        <button
          onClick={() => onEmergencyWithdraw(stake.tokenId)}
          disabled={isDisabled}
          className="w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          style={{ background: "#2a0a0a", border: "1px solid #5a1a1a", color: "#fca5a5" }}
          onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.borderColor = "#7a2a2a"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#5a1a1a"; }}
        >
          Emergency Withdraw (principal only)
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => onClaim(stake.tokenId)}
            disabled={isDisabled || normalActionsBlocked || stake.pendingReward === 0n}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-2)", color: "var(--text)" }}
            onMouseEnter={(e) => { if (!isDisabled && !normalActionsBlocked) e.currentTarget.style.borderColor = "var(--border-3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-2)"; }}
          >
            Claim Rewards
          </button>
          <button
            onClick={() => onUnstake(stake.tokenId)}
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
          {/* Transfer NFT button */}
          <button
            onClick={() => { setShowTransfer((v) => !v); setTransferError(""); }}
            disabled={isDisabled || normalActionsBlocked}
            className="px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{
              background: showTransfer ? "#0d0d1a" : "var(--surface-2)",
              border: `1px solid ${showTransfer ? "#4a4a8a" : "var(--border-2)"}`,
              color: "#818cf8",
            }}
            title="Transfer this staking NFT to another wallet"
            onMouseEnter={(e) => { if (!isDisabled && !normalActionsBlocked) e.currentTarget.style.borderColor = "#6060aa"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = showTransfer ? "#4a4a8a" : "var(--border-2)"; }}
          >
            Transfer
          </button>
        </div>
      )}

      {/* Transfer form (inline expansion) */}
      {showTransfer && !emergencyMode && (
        <div
          className="mt-3 rounded-lg p-3"
          style={{ background: "#0a0a14", border: "1px solid #2a2a4a" }}
        >
          <p className="text-xs mb-2" style={{ color: "#818cf8" }}>
            Transfer NFT #{stake.tokenId.toString()} to another wallet. The recipient gains full ownership of this stake position and all accrued rewards.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="0x recipient address"
              value={transferTo}
              onChange={(e) => { setTransferTo(e.target.value); setTransferError(""); }}
              className="flex-1 rounded-lg px-3 py-2 text-xs mono outline-none"
              style={{
                background: "var(--bg)",
                border: `1px solid ${transferError ? "#5a1a1a" : "#2a2a4a"}`,
                color: "var(--text)",
              }}
            />
            <button
              onClick={handleTransferConfirm}
              disabled={isDisabled || !transferTo}
              className="px-3 py-2 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "#1a1a2a", border: "1px solid #4a4a8a", color: "#818cf8" }}
            >
              Confirm
            </button>
            <button
              onClick={() => { setShowTransfer(false); setTransferTo(""); setTransferError(""); }}
              className="px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-2)", color: "var(--text-3)" }}
            >
              Cancel
            </button>
          </div>
          {transferError && (
            <p className="text-xs mt-1.5" style={{ color: "#fca5a5" }}>{transferError}</p>
          )}
        </div>
      )}
    </div>
  );
}
