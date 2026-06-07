import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONTRACT_ADDRESS, ABI, RPC_URL, SEPOLIA_CHAIN_ID } from '@/lib/contract';
import { parseError, getAPRBps } from '@/lib/utils';

export interface StakeInfo {
  tokenId: bigint;
  amount: bigint;
  startTime: number;
  lastClaimTime: number;
  active: boolean;
  pendingReward: bigint;
  apr: number;
  isLocked: boolean;
}

export interface TxHistoryItem {
  type: 'staked' | 'claimed' | 'unstaked' | 'emergency' | 'transferred';
  amountEth: string;
  hash: string;
  timestamp: number;
  stakeIndex?: number;
}

export type TxStatus = 'idle' | 'signing' | 'pending' | 'confirmed' | 'error';

export interface TxState {
  status: TxStatus;
  message: string;
  hash?: string;
}

const HISTORY_KEY = (address: string) => `staking_history_${address.toLowerCase()}`;
const SEVEN_DAYS = 7 * 24 * 3600;

async function loadHistory(address: string): Promise<TxHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY(address));
    return raw ? (JSON.parse(raw) as TxHistoryItem[]) : [];
  } catch {
    return [];
  }
}

async function saveHistory(address: string, items: TxHistoryItem[]) {
  try {
    await AsyncStorage.setItem(HISTORY_KEY(address), JSON.stringify(items.slice(0, 50)));
  } catch {}
}

export function useStaking(
  signer: ethers.JsonRpcSigner | null,
  address: string | null,
) {
  const [stakes, setStakes] = useState<StakeInfo[]>([]);
  const [totalStaked, setTotalStaked] = useState<bigint>(0n);
  const [totalRewardsPaid, setTotalRewardsPaid] = useState<bigint>(0n);
  const [totalPenaltiesCollected, setTotalPenaltiesCollected] = useState<bigint>(0n);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [contractOwner, setContractOwner] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txState, setTxState] = useState<TxState>({ status: 'idle', message: '' });
  const [txHistory, setTxHistory] = useState<TxHistoryItem[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getReadProvider = useCallback(
    () => new ethers.JsonRpcProvider(RPC_URL, SEPOLIA_CHAIN_ID),
    [],
  );

  const getContract = useCallback(
    (readOnly = false) => {
      if (!signer && !readOnly) return null;
      const runner = readOnly ? getReadProvider() : signer;
      if (!runner) return null;
      return new ethers.Contract(CONTRACT_ADDRESS, ABI, runner);
    },
    [signer, getReadProvider],
  );

  const fetchData = useCallback(async () => {
    if (!address) return;
    const contract = getContract(true);
    if (!contract) return;

    setIsLoading(true);
    try {
      const [rawPositions, ts, trp, tpc, em, paused, ownerAddr] = await Promise.all([
        contract.getUserStakes(address) as Promise<
          { tokenId: bigint; amount: bigint; startTime: bigint; lastClaimTime: bigint; active: boolean }[]
        >,
        contract.totalStaked() as Promise<bigint>,
        contract.totalRewardsPaid() as Promise<bigint>,
        contract.totalPenaltiesCollected() as Promise<bigint>,
        contract.emergencyMode() as Promise<boolean>,
        contract.paused() as Promise<boolean>,
        contract.owner() as Promise<string>,
      ]);

      const now = Math.floor(Date.now() / 1000);

      const enriched: StakeInfo[] = await Promise.all(
        rawPositions.map(async (p) => {
          const pendingReward = p.active
            ? (await contract.getPendingReward(p.tokenId)) as bigint
            : 0n;
          return {
            tokenId: p.tokenId,
            amount: p.amount,
            startTime: Number(p.startTime),
            lastClaimTime: Number(p.lastClaimTime),
            active: p.active,
            pendingReward,
            apr: getAPRBps(p.amount),
            isLocked: now < Number(p.startTime) + SEVEN_DAYS,
          };
        }),
      );

      setStakes(enriched);
      setTotalStaked(ts);
      setTotalRewardsPaid(trp);
      setTotalPenaltiesCollected(tpc);
      setEmergencyMode(em);
      setIsPaused(paused);
      setContractOwner(ownerAddr);
    } catch {
      // silently ignore read errors
    } finally {
      setIsLoading(false);
    }
  }, [address, getContract]);

  useEffect(() => {
    if (address) {
      loadHistory(address).then(setTxHistory);
    } else {
      setTxHistory([]);
      setStakes([]);
      setTotalStaked(0n);
      setTotalRewardsPaid(0n);
      setTotalPenaltiesCollected(0n);
      setEmergencyMode(false);
      setIsPaused(false);
      setContractOwner(null);
    }
  }, [address]);

  useEffect(() => {
    if (!address) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    fetchData();
    intervalRef.current = setInterval(fetchData, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [address, fetchData]);

  // Listen to contract events
  useEffect(() => {
    if (!address) return;
    const provider = getReadProvider();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const refresh = () => { fetchData(); };

    contract.on('StakeCreated', refresh);
    contract.on('RewardClaimed', refresh);
    contract.on('StakeWithdrawn', refresh);
    contract.on('PenaltyApplied', refresh);
    contract.on('EmergencyModeSet', refresh);
    contract.on('Paused', refresh);
    contract.on('Unpaused', refresh);
    contract.on('Transfer', refresh);

    return () => { contract.removeAllListeners(); };
  }, [address, fetchData, getReadProvider]);

  const pushHistory = useCallback(
    (item: TxHistoryItem) => {
      if (!address) return;
      setTxHistory((prev) => {
        const next = [item, ...prev];
        saveHistory(address, next);
        return next;
      });
    },
    [address],
  );

  const runTx = useCallback(
    async (
      action: () => Promise<ethers.ContractTransactionResponse>,
      historyItem: Omit<TxHistoryItem, 'hash' | 'timestamp'>,
    ) => {
      setTxState({ status: 'signing', message: 'Waiting for signature…' });
      try {
        const tx = await action();
        setTxState({ status: 'pending', message: 'Transaction pending…', hash: tx.hash });
        await tx.wait();
        setTxState({ status: 'confirmed', message: 'Transaction confirmed!', hash: tx.hash });
        pushHistory({ ...historyItem, hash: tx.hash, timestamp: Date.now() });
        await fetchData();
        setTimeout(() => setTxState({ status: 'idle', message: '' }), 4000);
      } catch (e) {
        setTxState({ status: 'error', message: parseError(e) });
        setTimeout(() => setTxState({ status: 'idle', message: '' }), 5000);
      }
    },
    [fetchData, pushHistory],
  );

  const doStake = useCallback(
    async (amountEth: string) => {
      const contract = getContract();
      if (!contract) return;
      const value = ethers.parseEther(amountEth);
      await runTx(
        () => contract.stake({ value }) as Promise<ethers.ContractTransactionResponse>,
        { type: 'staked', amountEth },
      );
    },
    [getContract, runTx],
  );

  const doClaimRewards = useCallback(
    async (tokenId: bigint) => {
      const contract = getContract();
      if (!contract) return;
      await runTx(
        () => contract.claimRewards(tokenId) as Promise<ethers.ContractTransactionResponse>,
        { type: 'claimed', amountEth: '0', stakeIndex: Number(tokenId) },
      );
    },
    [getContract, runTx],
  );

  const doUnstake = useCallback(
    async (tokenId: bigint) => {
      const contract = getContract();
      if (!contract) return;
      const stake = stakes.find((s) => s.tokenId === tokenId);
      await runTx(
        () => contract.unstake(tokenId) as Promise<ethers.ContractTransactionResponse>,
        {
          type: 'unstaked',
          amountEth: stake ? ethers.formatEther(stake.amount) : '0',
          stakeIndex: Number(tokenId),
        },
      );
    },
    [getContract, runTx, stakes],
  );

  const doEmergencyUserWithdraw = useCallback(
    async (tokenId: bigint) => {
      const contract = getContract();
      if (!contract) return;
      const stake = stakes.find((s) => s.tokenId === tokenId);
      await runTx(
        () => contract.emergencyUserWithdraw(tokenId) as Promise<ethers.ContractTransactionResponse>,
        {
          type: 'emergency',
          amountEth: stake ? ethers.formatEther(stake.amount) : '0',
          stakeIndex: Number(tokenId),
        },
      );
    },
    [getContract, runTx, stakes],
  );

  const doTransfer = useCallback(
    async (tokenId: bigint, toAddress: string) => {
      const contract = getContract();
      if (!contract || !address) return;
      await runTx(
        () => contract.transferFrom(address, toAddress, tokenId) as Promise<ethers.ContractTransactionResponse>,
        { type: 'transferred', amountEth: '0', stakeIndex: Number(tokenId) },
      );
    },
    [getContract, runTx, address],
  );

  const doPause = useCallback(async () => {
    const contract = getContract();
    if (!contract) return;
    await runTx(
      () => contract.pause() as Promise<ethers.ContractTransactionResponse>,
      { type: 'staked', amountEth: '0' },
    );
  }, [getContract, runTx]);

  const doUnpause = useCallback(async () => {
    const contract = getContract();
    if (!contract) return;
    await runTx(
      () => contract.unpause() as Promise<ethers.ContractTransactionResponse>,
      { type: 'staked', amountEth: '0' },
    );
  }, [getContract, runTx]);

  const doSetEmergencyMode = useCallback(async (enabled: boolean) => {
    const contract = getContract();
    if (!contract) return;
    await runTx(
      () => contract.setEmergencyMode(enabled) as Promise<ethers.ContractTransactionResponse>,
      { type: 'staked', amountEth: '0' },
    );
  }, [getContract, runTx]);

  const clearTxStatus = useCallback(() => {
    setTxState({ status: 'idle', message: '' });
  }, []);

  const totalClaimable = stakes.reduce(
    (sum, s) => (s.active ? sum + s.pendingReward : sum),
    0n,
  );

  return {
    stakes,
    totalStaked,
    totalRewardsPaid,
    totalPenaltiesCollected,
    totalClaimable,
    emergencyMode,
    isPaused,
    contractOwner,
    isLoading,
    txState,
    txHistory,
    doStake,
    doClaimRewards,
    doUnstake,
    doEmergencyUserWithdraw,
    doTransfer,
    doPause,
    doUnpause,
    doSetEmergencyMode,
    clearTxStatus,
    refresh: fetchData,
  };
}
