"use client";

import { formatETH } from "@/lib/utils";

interface Props {
  totalStaked: bigint;
  totalRewardsPaid: bigint;
  totalClaimable: bigint;
  activeStakesCount: number;
}

interface StatProps {
  label: string;
  value: string;
  dim?: string;
}

function Stat({ label, value, dim }: StatProps) {
  return (
    <div
      className="p-5 rounded-xl"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-3)" }}>
        {label}
      </p>
      <p className="text-2xl font-semibold num" style={{ color: "var(--text)" }}>
        {value}
      </p>
      {dim && <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{dim}</p>}
    </div>
  );
}

export function Dashboard({ totalStaked, totalRewardsPaid, totalClaimable, activeStakesCount }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat
        label="Total Staked"
        value={`${formatETH(totalStaked)} ETH`}
      />
      <Stat
        label="Your Positions"
        value={String(activeStakesCount)}
        dim={activeStakesCount === 1 ? "active stake" : "active stakes"}
      />
      <Stat
        label="Claimable"
        value={`${formatETH(totalClaimable, 6)} ETH`}
        dim="pending rewards"
      />
      <Stat
        label="Rewards Paid"
        value={`${formatETH(totalRewardsPaid)} ETH`}
        dim="all time"
      />
    </div>
  );
}
