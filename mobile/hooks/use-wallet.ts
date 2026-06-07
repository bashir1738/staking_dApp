import { useState, useEffect } from 'react';
import { useAppKit, useAccount, useProvider } from '@reown/appkit-react-native';
import { ethers } from 'ethers';
import { SEPOLIA_CHAIN_ID, RPC_URL } from '@/lib/contract';

export interface WalletState {
  address: string | null;
  chainId: number | null;
  walletBalance: bigint;
  isConnected: boolean;
  signer: ethers.JsonRpcSigner | null;
  connect: () => void;
  disconnect: () => void;
  switchToSepolia: () => Promise<void>;
  onSepolia: boolean;
}

export function useWallet(): WalletState {
  const { open, disconnect: appKitDisconnect, switchNetwork } = useAppKit();
  const { address, isConnected, chainId } = useAccount();
  const { provider: walletProvider } = useProvider();

  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [walletBalance, setWalletBalance] = useState<bigint>(0n);

  const numericChainId = chainId ? parseInt(chainId, 10) : null;
  const onSepolia = numericChainId === SEPOLIA_CHAIN_ID;

  useEffect(() => {
    if (!walletProvider || !address || !isConnected) {
      setSigner(null);
      setWalletBalance(0n);
      return;
    }

    const ethersProvider = new ethers.BrowserProvider(
      walletProvider as ethers.Eip1193Provider,
      numericChainId ?? 'any',
    );

    ethersProvider.getSigner(address)
      .then(setSigner)
      .catch(() => setSigner(null));

    ethersProvider.getBalance(address)
      .then(setWalletBalance)
      .catch(() => setWalletBalance(0n));
  }, [walletProvider, address, isConnected, numericChainId]);

  // Refresh balance periodically
  useEffect(() => {
    if (!address || !isConnected) return;
    const readProvider = new ethers.JsonRpcProvider(RPC_URL, SEPOLIA_CHAIN_ID);
    const interval = setInterval(() => {
      readProvider.getBalance(address).then(setWalletBalance).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [address, isConnected]);

  const switchToSepolia = async () => {
    if (!walletProvider) return;
    try {
      await (walletProvider as ethers.Eip1193Provider).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
      });
    } catch {
      try {
        await (walletProvider as ethers.Eip1193Provider).request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
            chainName: 'Sepolia',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        });
      } catch {}
    }
  };

  return {
    address: address ?? null,
    chainId: numericChainId,
    walletBalance,
    isConnected,
    signer,
    connect: () => open(),
    disconnect: () => appKitDisconnect(),
    switchToSepolia,
    onSepolia,
  };
}
