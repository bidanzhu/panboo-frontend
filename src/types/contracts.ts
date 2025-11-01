// Contract Types

export interface ERC20Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface PairReserves {
  reserve0: bigint;
  reserve1: bigint;
  blockTimestampLast: number;
}

export interface PoolInfo {
  lpToken: string;
  allocPoint: bigint;
  lastRewardBlock: bigint;
  accRewardPerShare: bigint;
  totalStaked: bigint;
}

export interface UserInfo {
  amount: bigint;
  rewardDebt: bigint;
  pendingReward: bigint;
}

// Transaction types
export interface TransactionRequest {
  to?: string;
  from?: string;
  data?: string;
  value?: bigint;
  gasLimit?: bigint;
  gasPrice?: bigint;
  nonce?: number;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  status: number;
  from: string;
  to: string;
  gasUsed: bigint;
}

// Multicall types
export interface Call3 {
  target: string;
  allowFailure: boolean;
  callData: string;
}

export interface Call3Result {
  success: boolean;
  returnData: string;
}
