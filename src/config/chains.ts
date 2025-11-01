import type { Chain } from 'wagmi/chains';
import { ENV } from '@/contracts/addresses';

// BSC Mainnet configuration
export const bsc: Chain = {
  id: 56,
  name: 'BNB Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ENV.RPC_URL],
    },
    public: {
      http: [
        'https://bsc-dataseed.binance.org',
        'https://bsc-dataseed1.defibit.io',
        'https://bsc-dataseed1.ninicoin.io',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'BscScan',
      url: 'https://bscscan.com',
    },
  },
  contracts: {
    multicall3: {
      address: '0x1Ee38d535d541c55C9dae27B12edf090C608E6Fb',
      blockCreated: 15921452,
    },
  },
  testnet: false,
};

// BSC Testnet configuration
export const bscTestnet: Chain = {
  id: 97,
  name: 'BNB Smart Chain Testnet',
  nativeCurrency: {
    name: 'tBNB',
    symbol: 'tBNB',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    },
    public: {
      http: [
        'https://data-seed-prebsc-1-s1.binance.org:8545',
        'https://data-seed-prebsc-2-s1.binance.org:8545',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'BscScan',
      url: 'https://testnet.bscscan.com',
    },
  },
  contracts: {
    multicall3: {
      address: '0xe348b292e8eA5FAB54340656f3D374b259D658b8',
      blockCreated: 17422483,
    },
  },
  testnet: true,
};

// Get the appropriate chain based on environment
export function getChain(): Chain {
  return ENV.CHAIN_ID === 97 ? bscTestnet : bsc;
}

// List of supported chains
export const supportedChains = [bsc, bscTestnet] as const;
