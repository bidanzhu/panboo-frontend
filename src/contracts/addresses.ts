import type { Address } from '@/types';

// Environment variables with type safety
export const ENV = {
  CHAIN_ID: parseInt(import.meta.env.VITE_CHAIN_ID || '56'),
  TOKEN_ADDRESS: (import.meta.env.VITE_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
  MASTERCHEF_ADDRESS: (import.meta.env.VITE_MASTERCHEF_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
  CHARITY_WALLET: (import.meta.env.VITE_CHARITY_WALLET || '0x0000000000000000000000000000000000000000') as Address,
  PANBOO_BNB_PAIR: (import.meta.env.VITE_PANBOO_BNB_PAIR || '0x0000000000000000000000000000000000000000') as Address,
  API_URL: import.meta.env.VITE_API_URL || 'https://panboo-api.onrender.com',
  RPC_URL: import.meta.env.VITE_RPC_URL || 'https://bsc-dataseed.binance.org',
  WALLETCONNECT_ID: import.meta.env.VITE_WALLETCONNECT_ID || '',
  ENABLE_LIVE_FEED: import.meta.env.VITE_ENABLE_LIVE_FEED === 'true',
  ENABLE_FAKE_DATA: import.meta.env.VITE_ENABLE_FAKE_DATA === 'true',
} as const;

// Multicall3 addresses
export const MULTICALL3_ADDRESS = {
  56: '0x1Ee38d535d541c55C9dae27B12edf090C608E6Fb' as Address, // BSC Mainnet
  97: '0xe348b292e8eA5FAB54340656f3D374b259D658b8' as Address, // BSC Testnet
} as const;

// Get Multicall3 address for current chain
export function getMulticall3Address(): Address {
  return MULTICALL3_ADDRESS[ENV.CHAIN_ID as keyof typeof MULTICALL3_ADDRESS] || MULTICALL3_ADDRESS[56];
}

// Contract addresses
export const ADDRESSES = {
  PANBOO_TOKEN: ENV.TOKEN_ADDRESS,
  MASTERCHEF: ENV.MASTERCHEF_ADDRESS,
  CHARITY_WALLET: ENV.CHARITY_WALLET,
  PANBOO_BNB_PAIR: ENV.PANBOO_BNB_PAIR,
  MULTICALL3: getMulticall3Address(),
} as const;

// PancakeSwap addresses (official)
export const PANCAKESWAP = {
  ROUTER: '0x10ED43C718714eb63d5aA57B78B54704E256024E' as Address, // BSC Mainnet
  FACTORY: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73' as Address, // BSC Mainnet
  WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as Address, // BSC Mainnet
} as const;

// Validate required environment variables
export function validateEnv(): string[] {
  const missing: string[] = [];

  if (ENV.CHAIN_ID !== 56 && ENV.CHAIN_ID !== 97) {
    missing.push('VITE_CHAIN_ID (must be 56 or 97)');
  }

  if (!ENV.TOKEN_ADDRESS || ENV.TOKEN_ADDRESS === '0x0000000000000000000000000000000000000000') {
    missing.push('VITE_TOKEN_ADDRESS');
  }

  if (!ENV.MASTERCHEF_ADDRESS || ENV.MASTERCHEF_ADDRESS === '0x0000000000000000000000000000000000000000') {
    missing.push('VITE_MASTERCHEF_ADDRESS');
  }

  if (!ENV.CHARITY_WALLET || ENV.CHARITY_WALLET === '0x0000000000000000000000000000000000000000') {
    missing.push('VITE_CHARITY_WALLET');
  }

  if (!ENV.PANBOO_BNB_PAIR || ENV.PANBOO_BNB_PAIR === '0x0000000000000000000000000000000000000000') {
    missing.push('VITE_PANBOO_BNB_PAIR');
  }

  if (!ENV.WALLETCONNECT_ID || ENV.WALLETCONNECT_ID === 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    missing.push('VITE_WALLETCONNECT_ID');
  }

  return missing;
}

// Check if we're using placeholder addresses (for development)
export function isUsingPlaceholders(): boolean {
  const placeholderAddress = '0x0000000000000000000000000000000000000000';

  return (
    ENV.TOKEN_ADDRESS === placeholderAddress ||
    ENV.MASTERCHEF_ADDRESS === placeholderAddress ||
    ENV.CHARITY_WALLET === placeholderAddress ||
    ENV.PANBOO_BNB_PAIR === placeholderAddress
  );
}
