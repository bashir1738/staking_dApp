"use client";

import { useAccount, useSwitchChain, useBalance } from "wagmi";
import { ethers } from "ethers";
import { useEthersSigner } from "./useEthersSigner";
import { SEPOLIA_CHAIN_ID } from "@/lib/contract";

export interface WalletState {
  address: string | null;
  chainId: number | null;
  walletBalance: bigint;
  isConnected: boolean;
  signer: ethers.JsonRpcSigner | null;
  switchToSepolia: () => void;
}

export function useWallet(): WalletState {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: balanceData } = useBalance({
    address,
    query: { enabled: !!address },
  });
  const signer = useEthersSigner();

  return {
    address:         address   ?? null,
    chainId:         chainId   ?? null,
    walletBalance:   balanceData?.value ?? 0n,
    isConnected,
    signer,
    switchToSepolia: () => switchChain({ chainId: SEPOLIA_CHAIN_ID }),
  };
}
