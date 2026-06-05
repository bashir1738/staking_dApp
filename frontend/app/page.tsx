"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useWallet }    from "@/hooks/useWallet";
import { useStaking }   from "@/hooks/useStaking";
import { SEPOLIA_CHAIN_ID }  from "@/lib/contract";
import { WalletButton }  from "@/components/WalletButton";
import { NetworkGuard }  from "@/components/NetworkGuard";
import { Dashboard }     from "@/components/Dashboard";
import { StakeForm }     from "@/components/StakeForm";
import { StakeCard }     from "@/components/StakeCard";
import { TxHistory }     from "@/components/TxHistory";
import { TxStatus }      from "@/components/TxStatus";

export default function Home() {
  const wallet  = useWallet();
  const staking = useStaking(wallet.signer, wallet.address);

  const onSepolia    = wallet.chainId === SEPOLIA_CHAIN_ID;
  const isBusy       = staking.txState.status === "signing" || staking.txState.status === "pending";
  const activeStakes = staking.stakes.filter((s) => s.active);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 h-14"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold" style={{ color: "var(--text)" }}>Ola Stake</span>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-2)", color: "var(--text-3)" }}
          >
            Sepolia
          </span>
        </div>
        <WalletButton />
      </header>

      {/* ── Wrong network banner ────────────────────────────── */}
      {wallet.isConnected && !onSepolia && (
        <NetworkGuard onSwitch={wallet.switchToSepolia} />
      )}

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {!wallet.isConnected ? (
          <Landing />
        ) : !onSepolia ? (
          <WrongNetwork onSwitch={wallet.switchToSepolia} />
        ) : (
          <Connected
            wallet={wallet}
            staking={staking}
            activeStakes={activeStakes}
            isBusy={isBusy}
          />
        )}
      </main>

      <TxStatus txState={staking.txState} onDismiss={staking.clearTxStatus} />
    </div>
  );
}

/* ── Landing ──────────────────────────────────────────────── */
function Landing() {
  const { openConnectModal } = useConnectModal();

  return (
    <div className="flex flex-col items-center text-center pt-12 pb-6">
      <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--text)" }}>
        Ola Stake
      </h1>
      <p className="text-base mb-10" style={{ color: "var(--text-2)" }}>
        Stake your ETH on Sepolia and earn tiered APR rewards
      </p>

      <div className="grid grid-cols-3 gap-3 w-full max-w-md mb-10">
        {[
          { range: "< 1 ETH",      apr: "5%",  label: "Tier 1" },
          { range: "1 – 4.99 ETH", apr: "8%",  label: "Tier 2" },
          { range: "≥ 5 ETH",      apr: "12%", label: "Tier 3" },
        ].map((t) => (
          <div
            key={t.label}
            className="p-4 rounded-xl text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs mb-2 font-medium uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
              {t.label}
            </p>
            <p className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>{t.apr}</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>{t.range}</p>
          </div>
        ))}
      </div>

      <button
        onClick={openConnectModal}
        className="px-8 py-3 rounded-xl font-semibold cursor-pointer transition-colors mb-4"
        style={{ background: "#3a3a3a", color: "#e8e8e8" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#444444"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#3a3a3a"; }}
      >
        Connect Wallet
      </button>

      <p className="text-sm" style={{ color: "var(--text-3)" }}>
        7-day lock period · -10% early exit penalty
      </p>
    </div>
  );
}

/* ── Wrong network ────────────────────────────────────────── */
function WrongNetwork({ onSwitch }: { onSwitch: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
        style={{ background: "#180a0a", border: "1px solid #3a1515" }}
      >
        <span style={{ color: "var(--red)", fontSize: "20px" }}>⚠</span>
      </div>
      <p className="text-base font-medium" style={{ color: "var(--text)" }}>Wrong Network</p>
      <p className="text-sm" style={{ color: "var(--text-2)" }}>
        This app requires the Sepolia testnet
      </p>
      <button
        onClick={onSwitch}
        className="px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-colors mt-2"
        style={{ background: "#3a3a3a", color: "#e8e8e8" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#444444"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#3a3a3a"; }}
      >
        Switch to Sepolia
      </button>
    </div>
  );
}

/* ── Connected ────────────────────────────────────────────── */
interface ConnectedProps {
  wallet:       ReturnType<typeof useWallet>;
  staking:      ReturnType<typeof useStaking>;
  activeStakes: ReturnType<typeof useStaking>["stakes"];
  isBusy:       boolean;
}

function Connected({ wallet, staking, activeStakes, isBusy }: ConnectedProps) {
  return (
    <div className="flex flex-col gap-8">
      <Dashboard
        totalStaked={staking.totalStaked}
        totalRewardsPaid={staking.totalRewardsPaid}
        totalClaimable={staking.totalClaimable}
        activeStakesCount={activeStakes.length}
      />

      <div className="divider" />

      <StakeForm
        onStake={staking.doStake}
        isDisabled={isBusy}
        walletBalance={wallet.walletBalance}
      />

      <div className="divider" />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
            Your Stakes
          </h2>
          {activeStakes.length > 0 && (
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              {activeStakes.length} active
            </span>
          )}
        </div>

        {activeStakes.length === 0 ? (
          <div
            className="rounded-xl px-6 py-10 text-center"
            style={{ background: "var(--surface)", border: "1px dashed var(--border-2)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-3)" }}>No active stakes</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
              Stake some ETH above to start earning
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeStakes.map((stake) => (
              <StakeCard
                key={stake.index}
                stake={stake}
                onClaim={staking.doClaimRewards}
                onUnstake={staking.doUnstake}
                isDisabled={isBusy}
              />
            ))}
          </div>
        )}
      </section>

      {staking.txHistory.length > 0 && (
        <>
          <div className="divider" />
          <TxHistory items={staking.txHistory} />
        </>
      )}
    </div>
  );
}
