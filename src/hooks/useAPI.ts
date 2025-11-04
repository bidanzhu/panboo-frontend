import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { ENV } from '@/contracts/addresses';
import type {
  TokenPrice,
  CharitySummary,
  Donation,
  Pool,
  UserFarm,
  LiveFeedItem,
  FarmsSummary,
  DailyDonation,
} from '@/types';

const API_BASE = ENV.API_URL;
const STALE_TIME = 12000; // 12 seconds
const CACHE_TIME = 60000; // 1 minute

// Generic fetch function
async function fetchAPI<T>(endpoint: string, fallbackData?: T): Promise<T> {
  // If fake data is enabled and fallback is provided, return it immediately
  if (ENV.ENABLE_FAKE_DATA && fallbackData !== undefined) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
    return fallbackData;
  }

  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error);

    // If fallback data is provided, use it as a fallback
    if (fallbackData !== undefined) {
      console.warn(`Using fallback data for ${endpoint}`);
      return fallbackData;
    }

    throw error;
  }
}

// Token Price
export function useTokenPrice(): UseQueryResult<TokenPrice, Error> {
  const { fakeTokenPrice } = useFakeData();

  return useQuery({
    queryKey: ['tokenPrice'],
    queryFn: () => fetchAPI<TokenPrice>('/token/price', fakeTokenPrice),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 3,
    retryDelay: 1000,
  });
}

// Charity Summary
export function useCharitySummary(): UseQueryResult<CharitySummary, Error> {
  const { fakeCharitySummary } = useFakeData();

  return useQuery({
    queryKey: ['charitySummary'],
    queryFn: () => fetchAPI<CharitySummary>('/charity/summary', fakeCharitySummary),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 3,
  });
}

// Recent Donations
export function useRecentDonations(limit: number = 10): UseQueryResult<Donation[], Error> {
  const { fakeRecentDonations } = useFakeData();

  return useQuery({
    queryKey: ['recentDonations', limit],
    queryFn: () => fetchAPI<Donation[]>(`/charity/recent?limit=${limit}`, fakeRecentDonations.slice(0, limit)),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Top Donors
export function useTopDonors(limit: number = 10): UseQueryResult<Donation[], Error> {
  const { fakeTopDonors } = useFakeData();

  return useQuery({
    queryKey: ['topDonors', limit],
    queryFn: () => fetchAPI<Donation[]>(`/charity/top?limit=${limit}`, fakeTopDonors.slice(0, limit)),
    staleTime: 30000, // 30 seconds
    gcTime: CACHE_TIME,
  });
}

// Daily Donations
export function useDailyDonations(days: number = 30): UseQueryResult<DailyDonation[], Error> {
  const { fakeDailyDonations } = useFakeData();

  return useQuery({
    queryKey: ['dailyDonations', days],
    queryFn: () => fetchAPI<DailyDonation[]>(`/charity/daily?days=${days}`, fakeDailyDonations.slice(0, days)),
    staleTime: 30000, // 30 seconds
    gcTime: CACHE_TIME,
  });
}

// Farm Pools
export function useFarmPools(): UseQueryResult<Pool[], Error> {
  const { fakePools } = useFakeData();

  return useQuery({
    queryKey: ['farmPools'],
    queryFn: () => fetchAPI<Pool[]>('/farms/pools', fakePools),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 3,
  });
}

// Farms Summary
export function useFarmsSummary(): UseQueryResult<FarmsSummary, Error> {
  const { fakeFarmsSummary } = useFakeData();

  return useQuery({
    queryKey: ['farmsSummary'],
    queryFn: () => fetchAPI<FarmsSummary>('/farms/summary', fakeFarmsSummary),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// User Farms
export function useUserFarms(wallet: string | undefined): UseQueryResult<UserFarm[], Error> {
  const { fakeUserFarms } = useFakeData();

  return useQuery({
    queryKey: ['userFarms', wallet],
    queryFn: () => fetchAPI<UserFarm[]>(`/farms/user/${wallet}`, fakeUserFarms),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!wallet,
  });
}

// Live Feed
export function useLiveFeed(
  limit: number = 10,
  enabled: boolean = ENV.ENABLE_LIVE_FEED
): UseQueryResult<LiveFeedItem[], Error> {
  const { fakeLiveFeed } = useFakeData();

  return useQuery({
    queryKey: ['liveFeed', limit],
    queryFn: () => fetchAPI<LiveFeedItem[]>(`/feed/live?limit=${limit}`, fakeLiveFeed.slice(0, limit)),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchInterval: enabled ? 15000 : false, // Refresh every 15 seconds if enabled
    enabled,
  });
}

// Fake data fallback when API is unavailable
export function useFakeData() {
  const isFakeDataEnabled = ENV.ENABLE_FAKE_DATA;

  const fakeTokenPrice: TokenPrice = {
    panbooPerBnb: '0.000001',
    bnbPerUsd: '320.50',
    panbooPerUsd: '0.00032',
    updatedAt: Date.now() / 1000,
  };

  const fakeCharitySummary: CharitySummary = {
    totalDonatedBnb: '12.5',
    totalDonatedUsd: '4006.25',
    txCount: 42,
    walletBalanceBnb: '0.75',
    pendingPledges: '856.32',
    updatedAt: Date.now() / 1000,
  };

  const fakeFarmsSummary: FarmsSummary = {
    totalTvlUsd: '125000',
    activePools: 3,
    totalRewardsDistributed: '50000',
  };

  const fakePools: Pool[] = [
    {
      pid: 0,
      lpAddress: '0x1234567890123456789012345678901234567890',
      name: 'PANBOO-BNB LP',
      allocPoint: 1000,
      totalStaked: '45000000000000000000000',
      rewardPerBlock: '10000000000000000000',
      tvlUsd: '85000',
      aprPct: '125.5',
    },
    {
      pid: 1,
      lpAddress: '0x2345678901234567890123456789012345678901',
      name: 'PANBOO-USDT LP',
      allocPoint: 500,
      totalStaked: '25000000000000000000000',
      rewardPerBlock: '5000000000000000000',
      tvlUsd: '32000',
      aprPct: '89.3',
    },
    {
      pid: 2,
      lpAddress: '0x3456789012345678901234567890123456789012',
      name: 'PANBOO-BUSD LP',
      allocPoint: 300,
      totalStaked: '8000000000000000000000',
      rewardPerBlock: '3000000000000000000',
      tvlUsd: '8000',
      aprPct: '67.8',
    },
  ];

  const fakeRecentDonations: Donation[] = [
    {
      wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amountPanboo: '1562500',
      amountBnb: '0.5',
      txHash: '0xabc123def456789012345678901234567890abcdef123456789012345678901234',
      timestamp: Date.now() / 1000 - 300,
    },
    {
      wallet: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
      amountPanboo: '3750000',
      amountBnb: '1.2',
      txHash: '0xdef456789012345678901234567890abcdef123456789012345678901234567890',
      timestamp: Date.now() / 1000 - 1200,
    },
    {
      wallet: '0x5c69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      amountPanboo: '937500',
      amountBnb: '0.3',
      txHash: '0xghi789012345678901234567890abcdef123456789012345678901234567890abc',
      timestamp: Date.now() / 1000 - 2400,
    },
    {
      wallet: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      amountPanboo: '7812500',
      amountBnb: '2.5',
      txHash: '0xjkl012345678901234567890abcdef123456789012345678901234567890abcdef',
      timestamp: Date.now() / 1000 - 3600,
    },
    {
      wallet: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      amountPanboo: '2500000',
      amountBnb: '0.8',
      txHash: '0xmno345678901234567890abcdef123456789012345678901234567890abcdef123',
      timestamp: Date.now() / 1000 - 7200,
    },
  ];

  const fakeTopDonors: Donation[] = [
    {
      wallet: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      amountPanboo: '17187500',
      amountBnb: '5.5',
      txHash: '0xtop1234567890123456789012345678901234567890123456789012345678901234',
      timestamp: Date.now() / 1000 - 86400,
    },
    {
      wallet: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
      amountPanboo: '10000000',
      amountBnb: '3.2',
      txHash: '0xtop2345678901234567890123456789012345678901234567890123456789012345',
      timestamp: Date.now() / 1000 - 172800,
    },
    {
      wallet: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      amountPanboo: '8750000',
      amountBnb: '2.8',
      txHash: '0xtop3456789012345678901234567890123456789012345678901234567890123456',
      timestamp: Date.now() / 1000 - 259200,
    },
    {
      wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amountPanboo: '5937500',
      amountBnb: '1.9',
      txHash: '0xtop4567890123456789012345678901234567890123456789012345678901234567',
      timestamp: Date.now() / 1000 - 345600,
    },
    {
      wallet: '0x5c69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      amountPanboo: '4062500',
      amountBnb: '1.3',
      txHash: '0xtop5678901234567890123456789012345678901234567890123456789012345678',
      timestamp: Date.now() / 1000 - 432000,
    },
  ];

  const fakeDailyDonations: DailyDonation[] = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
    totalBnb: (Math.random() * 2 + 0.5).toFixed(2),
    totalUsd: (Math.random() * 640 + 160).toFixed(2),
    txCount: Math.floor(Math.random() * 10 + 1),
  }));

  const fakeUserFarms: UserFarm[] = [
    {
      poolId: 0,
      stakedAmount: '5000000000000000000000',
      pendingRewards: '125000000000000000000',
      lpSymbol: 'PANBOO-BNB LP',
    },
    {
      poolId: 1,
      stakedAmount: '2000000000000000000000',
      pendingRewards: '45000000000000000000',
      lpSymbol: 'PANBOO-USDT LP',
    },
  ];

  const fakeLiveFeed: LiveFeedItem[] = [
    {
      id: '1',
      type: 'donation',
      txHash: '0xabc123...',
      timestamp: Date.now() / 1000 - 120,
      data: {
        donor: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        amountBnb: '0.5',
        amountUsd: '160.25',
      },
    },
    {
      id: '2',
      type: 'swap',
      txHash: '0xdef456...',
      timestamp: Date.now() / 1000 - 240,
      data: {
        trader: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
        amountIn: '1000000000000000000',
        amountOut: '320500000000000000000000',
        tokenIn: 'BNB',
        tokenOut: 'PANBOO',
      },
    },
    {
      id: '3',
      type: 'stake',
      txHash: '0xghi789...',
      timestamp: Date.now() / 1000 - 360,
      data: {
        user: '0x5c69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        poolId: 0,
        amount: '10000000000000000000',
        lpSymbol: 'PANBOO-BNB LP',
      },
    },
    {
      id: '4',
      type: 'harvest',
      txHash: '0xjkl012...',
      timestamp: Date.now() / 1000 - 480,
      data: {
        user: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        poolId: 1,
        amount: '250000000000000000000',
      },
    },
    {
      id: '5',
      type: 'donation',
      txHash: '0xmno345...',
      timestamp: Date.now() / 1000 - 600,
      data: {
        donor: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        amountBnb: '1.2',
        amountUsd: '384.60',
      },
    },
  ];

  return {
    isFakeDataEnabled,
    fakeTokenPrice,
    fakeCharitySummary,
    fakeFarmsSummary,
    fakePools,
    fakeRecentDonations,
    fakeTopDonors,
    fakeDailyDonations,
    fakeUserFarms,
    fakeLiveFeed,
  };
}
