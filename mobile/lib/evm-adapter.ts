import { EVMAdapter } from '@reown/appkit-common-react-native';
import type {
  AppKitNetwork,
  CaipAddress,
  GetBalanceParams,
  GetBalanceResponse,
} from '@reown/appkit-common-react-native';

export class WalletConnectEvmAdapter extends EVMAdapter {
  constructor() {
    super({ supportedNamespace: 'eip155', adapterType: 'ethers' });
  }

  getSupportedNamespace(): 'eip155' {
    return 'eip155';
  }

  getAccounts(): CaipAddress[] | undefined {
    if (!this.connector) return undefined;
    const ns = this.connector.getNamespaces();
    return ns?.['eip155']?.accounts as CaipAddress[] | undefined;
  }

  async disconnect(): Promise<void> {
    // Connector lifecycle is managed by AppKit
  }

  async switchNetwork(network: AppKitNetwork): Promise<void> {
    const provider = this.getProvider();
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${Number(network.id).toString(16)}` }],
      });
    } catch {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${Number(network.id).toString(16)}`,
          chainName: network.name,
          nativeCurrency: network.nativeCurrency,
          rpcUrls: network.rpcUrls.default.http,
          blockExplorerUrls: network.blockExplorers
            ? [network.blockExplorers.default.url]
            : [],
        }],
      });
    }
  }

  async getBalance({ address, network }: GetBalanceParams): Promise<GetBalanceResponse> {
    const provider = this.getProvider();
    const plainAddress = address?.split(':').pop() ?? '';
    try {
      const hex = await provider.request(
        { method: 'eth_getBalance', params: [plainAddress, 'latest'] },
        network.caipNetworkId,
      ) as string;
      const wei = BigInt(hex);
      const eth = (Number(wei) / 1e18).toFixed(6);
      return { symbol: 'ETH', amount: eth };
    } catch {
      return { symbol: 'ETH', amount: '0' };
    }
  }
}
