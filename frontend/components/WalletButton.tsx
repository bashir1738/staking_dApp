"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { shortenAddress } from "@/lib/utils";

export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
          >
            {!connected ? (
              <button
                onClick={openConnectModal}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                style={{ background: "#3a3a3a", color: "#e8e8e8", border: "1px solid #4a4a4a" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#444444"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#3a3a3a"; }}
              >
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={openAccountModal}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm mono cursor-pointer transition-colors"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border-2)", color: "var(--text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-2)"; }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: "var(--green)" }}
                  />
                  {account.displayName ?? shortenAddress(account.address)}
                </button>
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
