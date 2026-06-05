"use client";

import { useState, useEffect } from "react";
import { useWalletClient } from "wagmi";
import { ethers } from "ethers";
import type { Account, Chain, Client, Transport } from "viem";

// Converts a viem WalletClient to an ethers.js v6 JsonRpcSigner.
// This is the standard bridge used when mixing wagmi (viem) with ethers.js.
async function walletClientToSigner(
  client: Client<Transport, Chain, Account>
): Promise<ethers.JsonRpcSigner> {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  // transport is a viem Transport which implements EIP-1193
  const provider = new ethers.BrowserProvider(
    transport as unknown as ethers.Eip1193Provider,
    network
  );
  return provider.getSigner(account.address);
}

export function useEthersSigner(): ethers.JsonRpcSigner | null {
  const { data: walletClient } = useWalletClient();
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  useEffect(() => {
    if (!walletClient) {
      setSigner(null);
      return;
    }
    walletClientToSigner(walletClient)
      .then(setSigner)
      .catch(() => setSigner(null));
  }, [walletClient]);

  return signer;
}
