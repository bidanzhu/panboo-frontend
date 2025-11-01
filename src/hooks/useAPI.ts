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
async function fetchAPI<T>(endpoint: string): Promise<T> {
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
    throw error;
  }
}

// Token Price
export function useTokenPrice(): UseQueryResult<TokenPrice, Error> {
  return useQuery({
    queryKey: ['tokenPrice'],
    queryFn: () => fetchAPI<TokenPrice>('/token/price'),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 3,
    retryDelay: 1000,
  });
}

// Charity Summary
export function useCharitySummary(): UseQueryResult<CharitySummary, Error> {
  return useQuery({
    queryKey: ['charitySummary'],
    queryFn: () => fetchAPI<CharitySummary>('/charity/summary'),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 3,
  });
}

// Recent Donations
export function useRecentDonations(limit: number = 10): UseQueryResult<Donation[], Error> {
  return useQuery({
    queryKey: ['recentDonations', limit],
    queryFn: () => fetchAPI<Donation[]>(`/charity/recent?limit=${limit}`),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Top Donors
export function useTopDonors(limit: number = 10): UseQueryResult<Donation[], Error> {
  return useQuery({
    queryKey: ['topDonors', limit],
    queryFn: () => fetchAPI<Donation[]>(`/charity/top?limit=${limit}`),
    staleTime: 30000, // 30 seconds
    gcTime: CACHE_TIME,
  });
}

// Daily Donations
export function useDailyDonations(days: number = 30): UseQueryResult<DailyDonation[], Error> {
  return useQuery({
    queryKey: ['dailyDonations', days],
    queryFn: () => fetchAPI<DailyDonation[]>(`/charity/daily?days=${days}`),
    staleTime: 30000, // 30 seconds
    gcTime: CACHE_TIME,
  });
}

// Farm Pools
export function useFarmPools(): UseQueryResult<Pool[], Error> {
  return useQuery({
    queryKey: ['farmPools'],
    queryFn: () => fetchAPI<Pool[]>('/farms/pools'),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 3,
  });
}

// Farms Summary
export function useFarmsSummary(): UseQueryResult<FarmsSummary, Error> {
  return useQuery({
    queryKey: ['farmsSummary'],
    queryFn: () => fetchAPI<FarmsSummary>('/farms/summary'),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// User Farms
export function useUserFarms(wallet: string | undefined): UseQueryResult<UserFarm[], Error> {
  return useQuery({
    queryKey: ['userFarms', wallet],
    queryFn: () => fetchAPI<UserFarm[]>(`/farms/user/${wallet}`),
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
  return useQuery({
    queryKey: ['liveFeed', limit],
    queryFn: () => fetchAPI<LiveFeedItem[]>(`/feed/live?limit=${limit}`),
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
    updatedAt: Date.now() / 1000,
  };

  const fakeFarmsSummary: FarmsSummary = {
    totalTvlUsd: '125000',
    activePools: 3,
    totalRewardsDistributed: '50000',
  };

  return {
    isFakeDataEnabled,
    fakeTokenPrice,
    fakeCharitySummary,
    fakeFarmsSummary,
  };
}
