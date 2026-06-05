"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, ABI } from "@/lib/contract";
import { parseError, getAPRBps } from "@/lib/utils";

export interface StakeInfo {
  index: number;
  amount: bigint;
  startTime: number;
  lastClaimTime: number;
  active: boolean;
  pendingReward: bigint;
  apr: number;
  isLocked: boolean;
}

export interface TxHistoryItem {
  type: "staked" | "claimed" | "unstaked";
  amountEth: string;
  hash: string;
  timestamp: number;
  stakeIndex?: number;
}

export type TxStatus = "idle" | "signing" | "pending" | "confirmed" | "error";

export interface TxState {
  status: TxStatus;
  message: string;
  hash?: string;
}

const HISTORY_KEY = (address: string) => `staking_history_${address.toLowerCase()}`;
const SEVEN_DAYS = 7 * 24 * 3600;

function loadHistory(address: string): TxHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY(address));
    return raw ? (JSON.parse(raw) as TxHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(address: string, items: TxHistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY(address), JSON.stringify(items.slice(0, 50)));
  } catch {}
}

export function useStaking(
  signer: ethers.JsonRpcSigner | null,
  address: string | null
) {
  const [stakes, setStakes] = useState<StakeInfo[]>([]);
  const [totalStaked, setTotalStaked] = useState<bigint>(0n);
  const [totalRewardsPaid, setTotalRewardsPaid] = useState<bigint>(0n);
  const [totalPenaltiesCollected, setTotalPenaltiesCollected] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [txState, setTxState] = useState<TxState>({ status: "idle", message: "" });
  const [txHistory, setTxHistory] = useState<TxHistoryItem[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getContract = useCallback(
    (readOnly = false) => {
      if (!signer && !readOnly) return null;
      const provider = signer?.provider ?? null;
      const runner = readOnly ? provider : signer;
      if (!runner) return null;
      return new ethers.Contract(CONTRACT_ADDRESS, ABI, runner);
    },
    [signer]
  );

  const fetchData = useCallback(async () => {
    if (!address || !signer) return;
    const contract = getContract(false);
    if (!contract) return;

    setIsLoading(true);
    try {
      const [rawStakes, ts, trp, tpc] = await Promise.all([
        contract.getUserStakes(address) as Promise<
          { amount: bigint; startTime: bigint; lastClaimTime: bigint; active: boolean }[]
        >,
        contract.totalStaked() as Promise<bigint>,
        contract.totalRewardsPaid() as Promise<bigint>,
        contract.totalPenaltiesCollected() as Promise<bigint>,
      ]);

      const now = Math.floor(Date.now() / 1000);

      const enriched: StakeInfo[] = await Promise.all(
        rawStakes.map(async (s, i) => {
          const pendingReward = s.active
            ? (await contract.getPendingReward(address, i)) as bigint
            : 0n;
          return {
            index: i,
            amount: s.amount,
            startTime: Number(s.startTime),
            lastClaimTime: Number(s.lastClaimTime),
            active: s.active,
            pendingReward,
            apr: getAPRBps(s.amount),
            isLocked: now < Number(s.startTime) + SEVEN_DAYS,
          };
        })
      );

      setStakes(enriched);
      setTotalStaked(ts);
      setTotalRewardsPaid(trp);
      setTotalPenaltiesCollected(tpc);
    } catch {
      // silently ignore read errors (e.g. wrong network)
    } finally {
      setIsLoading(false);
    }
  }, [address, signer, getContract]);

  // Load history from localStorage when address changes
  useEffect(() => {
    if (address) {
      setTxHistory(loadHistory(address));
    } else {
      setTxHistory([]);
      setStakes([]);
      setTotalStaked(0n);
      setTotalRewardsPaid(0n);
      setTotalPenaltiesCollected(0n);
    }
  }, [address]);

  // Fetch on connect + refresh every 30s
  useEffect(() => {
    if (!address || !signer) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    fetchData();
    intervalRef.current = setInterval(fetchData, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [address, signer, fetchData]);

  const pushHistory = useCallback(
    (item: TxHistoryItem) => {
      if (!address) return;
      setTxHistory((prev) => {
        const next = [item, ...prev];
        saveHistory(address, next);
        return next;
      });
    },
    [address]
  );

  const runTx = useCallback(
    async (
      action: () => Promise<ethers.ContractTransactionResponse>,
      historyItem: Omit<TxHistoryItem, "hash" | "timestamp">
    ) => {
      setTxState({ status: "signing", message: "Waiting for signature..." });
      try {
        const tx = await action();
        setTxState({ status: "pending", message: "Transaction pending...", hash: tx.hash });
        await tx.wait();
        setTxState({ status: "confirmed", message: "Transaction confirmed!", hash: tx.hash });
        pushHistory({ ...historyItem, hash: tx.hash, timestamp: Date.now() });
        await fetchData();
        setTimeout(() => setTxState({ status: "idle", message: "" }), 4000);
      } catch (e) {
        setTxState({ status: "error", message: parseError(e) });
        setTimeout(() => setTxState({ status: "idle", message: "" }), 5000);
      }
    },
    [fetchData, pushHistory]
  );

  const doStake = useCallback(
    async (amountEth: string) => {
      const contract = getContract();
      if (!contract) return;
      const value = ethers.parseEther(amountEth);
      await runTx(
        () => contract.stake({ value }) as Promise<ethers.ContractTransactionResponse>,
        { type: "staked", amountEth }
      );
    },
    [getContract, runTx]
  );

  const doClaimRewards = useCallback(
    async (stakeIndex: number) => {
      const contract = getContract();
      if (!contract) return;
      await runTx(
        () => contract.claimRewards(stakeIndex) as Promise<ethers.ContractTransactionResponse>,
        { type: "claimed", amountEth: "0", stakeIndex }
      );
    },
    [getContract, runTx]
  );

  const doUnstake = useCallback(
    async (stakeIndex: number) => {
      const contract = getContract();
      if (!contract) return;
      const stake = stakes.find((s) => s.index === stakeIndex);
      await runTx(
        () => contract.unstake(stakeIndex) as Promise<ethers.ContractTransactionResponse>,
        {
          type: "unstaked",
          amountEth: stake ? ethers.formatEther(stake.amount) : "0",
          stakeIndex,
        }
      );
    },
    [getContract, runTx, stakes]
  );

  const clearTxStatus = useCallback(() => {
    setTxState({ status: "idle", message: "" });
  }, []);

  const totalClaimable = stakes.reduce(
    (sum, s) => (s.active ? sum + s.pendingReward : sum),
    0n
  );

  return {
    stakes,
    totalStaked,
    totalRewardsPaid,
    totalPenaltiesCollected,
    totalClaimable,
    isLoading,
    txState,
    txHistory,
    doStake,
    doClaimRewards,
    doUnstake,
    clearTxStatus,
    refresh: fetchData,
  };
}
