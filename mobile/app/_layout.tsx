import 'react-native-get-random-values';
import '@walletconnect/react-native-compat';

import { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAppKit, AppKitProvider, AppKit } from '@reown/appkit-react-native';
import type { Storage } from '@reown/appkit-common-react-native';
import { WALLETCONNECT_PROJECT_ID, RPC_URL } from '@/lib/contract';
import { WalletConnectEvmAdapter } from '@/lib/evm-adapter';
import type { Network } from '@reown/appkit-common-react-native';
import { OnboardingScreen, ONBOARDING_KEY } from '@/components/onboarding-screen';

// ── Network ──────────────────────────────────────────────────────────────────

const sepolia: Network = {
  id: 11155111,
  name: 'Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' } },
  chainNamespace: 'eip155',
  caipNetworkId: 'eip155:11155111',
  testnet: true,
};

// ── AppKit storage adapter ────────────────────────────────────────────────────

class AppKitStorage implements Storage {
  async getKeys() {
    const keys = await AsyncStorage.getAllKeys();
    return [...keys];
  }
  async getEntries<T = any>(): Promise<[string, T][]> {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet([...keys]);
    return pairs.map(([k, v]) => [k, v ? JSON.parse(v) : undefined]) as [string, T][];
  }
  async getItem(key: string) {
    const v = await AsyncStorage.getItem(key);
    return v ? JSON.parse(v) : undefined;
  }
  async setItem(key: string, value: unknown) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }
  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
  }
}

// ── AppKit singleton (created once at module level) ───────────────────────────

const appKit = createAppKit({
  projectId: WALLETCONNECT_PROJECT_ID,
  networks: [sepolia],
  defaultNetwork: sepolia,
  adapters: [new WalletConnectEvmAdapter()],
  storage: new AppKitStorage(),
  metadata: {
    name: 'Ola Stake',
    description: 'Stake ETH on Sepolia and earn tiered APR rewards',
    url: 'https://olastake.app',
    icons: [],
  },
  features: { swaps: false, onramp: false },
});

// ── Root layout ───────────────────────────────────────────────────────────────

export default function RootLayout() {
  // null = still checking, false = show onboarding, true = go to app
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(!!val);
    });
  }, []);

  // Don't render anything while checking AsyncStorage (avoids flash)
  if (onboardingDone === null) return null;

  return (
    <AppKitProvider instance={appKit}>
      {!onboardingDone ? (
        <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      )}
      <StatusBar style="light" />
      <AppKit />
    </AppKitProvider>
  );
}
