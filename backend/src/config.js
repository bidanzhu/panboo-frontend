import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Blockchain
  rpcUrl: process.env.RPC_URL || 'https://bsc-dataseed.binance.org',
  chainId: parseInt(process.env.CHAIN_ID || '56'),

  // Contract Addresses
  tokenAddress: process.env.TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
  masterChefAddress: process.env.MASTERCHEF_ADDRESS || '0x0000000000000000000000000000000000000000',
  charityWallet: process.env.CHARITY_WALLET || '0x0000000000000000000000000000000000000000',
  panbooBnbPair: process.env.PANBOO_BNB_PAIR || '0x0000000000000000000000000000000000000000',

  // PancakeSwap
  pancakeRouter: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  pancakeFactory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
  wbnb: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  busd: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',

  // Database (Turso)
  tursoUrl: process.env.TURSO_URL || 'file:panboo.db',
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN || '',

  // API Server
  port: parseInt(process.env.PORT || '3001'),
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Listener
  pollInterval: parseInt(process.env.POLL_INTERVAL || '12000'), // 12 seconds
  startBlock: parseInt(process.env.START_BLOCK || '0'), // 0 means latest

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate required config
export function validateConfig() {
  const errors = [];

  if (config.tokenAddress === '0x0000000000000000000000000000000000000000') {
    errors.push('TOKEN_ADDRESS is not set');
  }

  if (config.masterChefAddress === '0x0000000000000000000000000000000000000000') {
    errors.push('MASTERCHEF_ADDRESS is not set');
  }

  if (config.charityWallet === '0x0000000000000000000000000000000000000000') {
    errors.push('CHARITY_WALLET is not set');
  }

  if (config.panbooBnbPair === '0x0000000000000000000000000000000000000000') {
    errors.push('PANBOO_BNB_PAIR is not set');
  }

  return errors;
}
