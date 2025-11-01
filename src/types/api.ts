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
  wallet: string;
  pid: number;
  stakedAmount: string;
  pendingReward: string;
  updatedAt: number;
}

export type LiveFeedType = 'buy' | 'sell' | 'donation' | 'harvest';

export interface LiveFeedItem {
  id: string;
  type: LiveFeedType;
  wallet: string;
  amountPanboo?: string;
  amountBnb?: string;
  pid?: number;
  txHash: string;
  timestamp: number;
}

export interface FarmsSummary {
  totalTvlUsd: string;
  activePools: number;
  totalRewardsDistributed: string;
}

export interface DailyDonation {
  date: string;
  donationsBnb: string;
  donationsUsd: string;
}

// API Error Response
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}
