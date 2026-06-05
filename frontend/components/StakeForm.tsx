"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { formatETH, getAPRLabel, getAPRBps } from "@/lib/utils";

interface Props {
  onStake: (amountEth: string) => Promise<void>;
  isDisabled: boolean;
  walletBalance: bigint;
}

const TIERS = [
  { range: "< 1 ETH",      apr: "5%",  bps: 500  },
  { range: "1 – 4.99 ETH", apr: "8%",  bps: 800  },
  { range: "≥ 5 ETH",      apr: "12%", bps: 1200 },
];

export function StakeForm({ onStake, isDisabled, walletBalance }: Props) {
  const [amount, setAmount] = useState("");
  const [error, setError]   = useState("");

  const amountWei = (() => {
    try { return amount && parseFloat(amount) > 0 ? ethers.parseEther(amount) : null; }
    catch { return null; }
  })();

  const activeAPR   = amountWei ? getAPRLabel(amountWei) : null;
  const activeBps   = amountWei ? getAPRBps(amountWei) : null;

  // Estimated rewards for 30 days
  const est30d = amountWei && activeBps
    ? (amountWei * BigInt(activeBps) * 30n * 86400n) / (365n * 86400n * 10000n)
    : null;

  const handleMax = () => {
    if (walletBalance === 0n) return;
    // Leave 0.005 ETH for gas
    const gas = ethers.parseEther("0.005");
    const max = walletBalance > gas ? walletBalance - gas : walletBalance;
    setAmount(ethers.formatEther(max));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) { setError("Enter a valid ETH amount."); return; }
    if (val < 0.001)                        { setError("Minimum stake is 0.001 ETH."); return; }
    if (walletBalance > 0n && ethers.parseEther(amount) > walletBalance) {
      setError("Amount exceeds wallet balance."); return;
    }
    await onStake(amount);
    setAmount("");
  };

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>
        Stake ETH
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Input row */}
        <div
          className="flex items-center rounded-lg overflow-hidden mb-1"
          style={{ background: "var(--bg)", border: `1px solid ${error ? "#4a1a1a" : "var(--border-2)"}` }}
        >
          <input
            type="number"
            step="any"
            min="0"
            placeholder="0.0"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(""); }}
            disabled={isDisabled}
            className="flex-1 px-4 py-3 bg-transparent text-lg font-medium outline-none disabled:opacity-50 num"
            style={{ color: "var(--text)" }}
          />
          <div className="flex items-center gap-2 pr-3">
            <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>ETH</span>
            {walletBalance > 0n && (
              <button
                type="button"
                onClick={handleMax}
                disabled={isDisabled}
                className="text-xs px-2 py-1 rounded cursor-pointer disabled:opacity-40 transition-colors"
                style={{ background: "var(--surface-3)", color: "var(--text-2)", border: "1px solid var(--border-2)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-2)"; }}
              >
                MAX
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs mb-3" style={{ color: "var(--red)" }}>{error}</p>
        )}

        {/* Balance hint */}
        {walletBalance > 0n && !error && (
          <p className="text-xs mb-4" style={{ color: "var(--text-3)" }}>
            Available: <span className="num" style={{ color: "var(--text-2)" }}>{formatETH(walletBalance, 4)} ETH</span>
          </p>
        )}

        {/* APR preview */}
        {amountWei && est30d ? (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-lg mb-4"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <div>
              <p className="text-xs mb-0.5" style={{ color: "var(--text-3)" }}>APR for this amount</p>
              <p className="text-lg font-semibold" style={{ color: "var(--text)" }}>{activeAPR}</p>
            </div>
            <div className="text-right">
              <p className="text-xs mb-0.5" style={{ color: "var(--text-3)" }}>Est. reward / 30 days</p>
              <p className="text-sm font-medium num" style={{ color: "var(--text-2)" }}>
                +{formatETH(est30d, 6)} ETH
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 mb-4">
            {TIERS.map((t) => (
              <div key={t.bps} className="flex-1 text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>{t.apr}</p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>{t.range}</p>
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={isDisabled || !amount}
          className="w-full py-3 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          style={{ background: "#3a3a3a", color: "#e8e8e8" }}
          onMouseEnter={(e) => { if (!isDisabled && amount) e.currentTarget.style.background = "#444444"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#3a3a3a"; }}
        >
          {isDisabled ? "Processing…" : "Stake ETH"}
        </button>

        <p className="text-center text-xs mt-3" style={{ color: "var(--text-3)" }}>
          7-day lock period · 10% early exit penalty
        </p>
      </form>
    </div>
  );
}
