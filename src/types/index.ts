// Export all types from a central location
export * from './api';
export * from './contracts';

// Common utility types
export type Address = `0x${string}`;

export interface EnvConfig {
  chainId: number;
  tokenAddress: Address;
  masterChefAddress: Address;
  charityWallet: Address;
  panbooBnbPair: Address;
  apiUrl: string;
  rpcUrl: string;
  walletConnectId: string;
  enableLiveFeed: boolean;
  enableFakeData: boolean;
}

export interface ChainConfig {
  id: number;
  name: string;
  network: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: { http: string[] };
    public: { http: string[] };
  };
  blockExplorers: {
    default: { name: string; url: string };
  };
}
