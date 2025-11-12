// API Response Types

export interface TokenPrice {
  panbooPerBnb: string;
  bnbPerUsd: string;
  panbooPerUsd: string;
  updatedAt: number;
}

export interface CharitySummary {
  totalDonatedBnb: string;
  totalDonatedUsd: string;
  txCount: number;
  walletBalanceBnb: string;
  pendingPledges?: string; // PANBOO tokens waiting to be swapped
  updatedAt: number;
}

export interface Donation {
  wallet: string;
  amountPanboo: string;
  amountBnb?: string;
  txHash: string;
  timestamp: number;
}

export interface Pool {
  pid: number;
  lpAddress: string;
  name: string;
  allocPoint: number;
  rewardPerBlock: string;
  tvlUsd: string;
  aprPct: string;
  totalStaked?: string;
}

export interface UserFarm {
  poolId: number;
  stakedAmount: string;
  pendingRewards: string;
  lpSymbol: string;
}

export type LiveFeedType = 'buy' | 'sell' | 'donation' | 'harvest' | 'swap' | 'stake';

// Data types for different feed types
export interface BuySellFeedData {
  wallet: string;
  amount: string;
  amountUsd?: string;
  isBuy: boolean;
}

export interface DonationFeedData {
  wallet: string;
  panbooAmount: string;
  bnbAmount: string;
  usdAmount?: string;
}

export interface HarvestFeedData {
  wallet: string;
  rewardAmount: string;
  poolId: number;
}

export interface StakeFeedData {
  wallet: string;
  amount: string;
  poolId: number;
  isDeposit: boolean;
}

export type LiveFeedData = BuySellFeedData | DonationFeedData | HarvestFeedData | StakeFeedData | Record<string, unknown>;

export interface LiveFeedItem {
  id: string;
  type: LiveFeedType;
  txHash: string;
  timestamp: number;
  data: LiveFeedData;
}

export interface FarmsSummary {
  totalTvlUsd: string;
  activePools: number;
  totalRewardsDistributed: string;
}

export interface DailyDonation {
  date: string;
  totalBnb: string;
  totalUsd: string;
  txCount: number;
}

// API Error Response
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}
