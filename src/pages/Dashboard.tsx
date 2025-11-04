import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Award,
  TrendingUp,
  Heart,
  Sprout,
  Activity,
  Trophy,
  Calendar,
  ExternalLink,
} from 'lucide-react';

interface UserStats {
  address: string;
  donations: {
    totalBnb: string;
    totalUsd: string;
    count: number;
    rank: number | null;
    firstDonation: number | null;
    lastDonation: number | null;
  };
  trading: {
    totalVolumeBnb: string;
    swapCount: number;
    rank: number | null;
    firstSwap: number | null;
    lastSwap: number | null;
  };
  farming: {
    totalDeposited: string;
    totalWithdrawn: string;
    totalHarvested: string;
    poolsParticipated: number;
    totalTransactions: number;
    rank: number | null;
    currentStaked: string;
    pendingRewards: string;
    activePositions: number;
  };
  positions: Array<{
    poolId: number;
    stakedAmount: string;
    pendingRewards: string;
    lastUpdated: number;
  }>;
}

interface HistoryItem {
  type: string;
  txHash: string;
  timestamp: number;
  amount: string;
  amountUsd: string | null;
  poolId: number | null;
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      fetchUserData();
    }
  }, [address, isConnected]);

  const fetchUserData = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
      const useMockData = import.meta.env.VITE_ENABLE_FAKE_DATA === 'true';

      // If mock data is enabled, use fake data
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay

        const mockStats: UserStats = {
          address,
          donations: {
            totalBnb: '2.5',
            totalUsd: '801.25',
            count: 8,
            rank: 4,
            firstDonation: Date.now() / 1000 - 2592000, // 30 days ago
            lastDonation: Date.now() / 1000 - 300, // 5 minutes ago
          },
          trading: {
            totalVolumeBnb: '15.3',
            swapCount: 24,
            rank: 12,
            firstSwap: Date.now() / 1000 - 2592000,
            lastSwap: Date.now() / 1000 - 1200,
          },
          farming: {
            totalDeposited: '30000',
            totalWithdrawn: '5000',
            totalHarvested: '1250',
            poolsParticipated: 2,
            totalTransactions: 15,
            rank: 8,
            currentStaked: '25000',
            pendingRewards: '1250',
            activePositions: 2,
          },
          positions: [
            {
              poolId: 0,
              stakedAmount: '15000',
              pendingRewards: '750',
              lastUpdated: Date.now() / 1000 - 3600,
            },
            {
              poolId: 1,
              stakedAmount: '10000',
              pendingRewards: '500',
              lastUpdated: Date.now() / 1000 - 7200,
            },
          ],
        };

        const mockHistory: HistoryItem[] = [
          { type: 'donation', txHash: '0xabc123...', timestamp: Date.now() / 1000 - 300, amount: '0.5', amountUsd: '160.25', poolId: null },
          { type: 'swap', txHash: '0xdef456...', timestamp: Date.now() / 1000 - 1200, amount: '320500', amountUsd: null, poolId: null },
          { type: 'stake', txHash: '0xghi789...', timestamp: Date.now() / 1000 - 2400, amount: '10000', amountUsd: null, poolId: 0 },
          { type: 'harvest', txHash: '0xjkl012...', timestamp: Date.now() / 1000 - 3600, amount: '250', amountUsd: null, poolId: 0 },
          { type: 'donation', txHash: '0xmno345...', timestamp: Date.now() / 1000 - 7200, amount: '1.2', amountUsd: '384.60', poolId: null },
        ];

        setStats(mockStats);
        setHistory(mockHistory);
        setIsLoading(false);
        return;
      }

      // Fetch stats and history in parallel
      const [statsRes, historyRes] = await Promise.all([
        fetch(`${apiUrl}/user/${address}/stats`),
        fetch(`${apiUrl}/user/${address}/history?limit=20`),
      ]);

      if (!statsRes.ok || !historyRes.ok) {
        throw new Error('Failed to fetch user data');
      }

      const statsData = await statsRes.json();
      const historyData = await historyRes.json();

      setStats(statsData);
      setHistory(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      console.error('Error fetching user data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'donation':
        return <Heart className="w-4 h-4 text-pink-500" />;
      case 'swap':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'deposit':
        return <Sprout className="w-4 h-4 text-green-500" />;
      case 'withdraw':
        return <Activity className="w-4 h-4 text-orange-500" />;
      case 'harvest':
        return <Award className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'donation':
        return 'Charity Donation';
      case 'swap':
        return 'Token Swap';
      case 'deposit':
        return 'Farm Deposit';
      case 'withdraw':
        return 'Farm Withdraw';
      case 'harvest':
        return 'Rewards Harvest';
      default:
        return type;
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="w-16 h-16 text-[#00C48C] mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground text-center">
              Please connect your wallet to view your dashboard and statistics
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>

        {/* Skeleton for stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="gradient-card">
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-5 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skeleton for activity */}
        <Card className="gradient-card">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-500">{error || 'Failed to load dashboard'}</p>
            <Button onClick={fetchUserData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
        <p className="text-muted-foreground">
          Track your donations, trading, and farming activity
        </p>
        {address && (
          <p className="text-sm text-muted-foreground mt-1">
            Address: {formatAddress(address)}
          </p>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Donations Card */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Charity Donations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Donated</p>
                <p className="text-2xl font-bold text-[#00C48C]">
                  {parseFloat(stats.donations.totalUsd).toFixed(2)} USD
                </p>
                <p className="text-sm text-muted-foreground">
                  {parseFloat(stats.donations.totalBnb).toFixed(4)} BNB
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Donations</p>
                  <p className="text-lg font-bold">{stats.donations.count}</p>
                </div>
                {stats.donations.rank && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Rank</p>
                    <p className="text-lg font-bold text-[#00C48C]">#{stats.donations.rank}</p>
                  </div>
                )}
              </div>
              {stats.donations.firstDonation && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Member since {formatTimestamp(stats.donations.firstDonation)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trading Card */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Trading Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold text-[#00C48C]">
                  {parseFloat(stats.trading.totalVolumeBnb).toFixed(4)} BNB
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Swaps</p>
                  <p className="text-lg font-bold">{stats.trading.swapCount}</p>
                </div>
                {stats.trading.rank && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Rank</p>
                    <p className="text-lg font-bold text-[#00C48C]">#{stats.trading.rank}</p>
                  </div>
                )}
              </div>
              {stats.trading.firstSwap && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Trading since {formatTimestamp(stats.trading.firstSwap)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Farming Card */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="w-5 h-5 text-green-500" />
              Farming Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Currently Staked</p>
                <p className="text-2xl font-bold text-[#00C48C]">
                  {parseFloat(stats.farming.currentStaked).toFixed(2)} LP
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Harvested</p>
                  <p className="text-lg font-bold">
                    {parseFloat(stats.farming.totalHarvested).toFixed(2)}
                  </p>
                </div>
                {stats.farming.rank && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Rank</p>
                    <p className="text-lg font-bold text-[#00C48C]">#{stats.farming.rank}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {stats.farming.activePositions} active position(s) in {stats.farming.poolsParticipated} pool(s)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Positions */}
      {stats.positions.length > 0 && (
        <Card className="gradient-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="w-5 h-5 text-[#00C48C]" />
              Active Farm Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.positions.map((position) => (
                <div
                  key={position.poolId}
                  className="flex items-center justify-between p-4 bg-muted rounded-md"
                >
                  <div>
                    <p className="font-bold">Pool #{position.poolId}</p>
                    <p className="text-sm text-muted-foreground">
                      Staked: {parseFloat(position.stakedAmount).toFixed(2)} LP
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Pending Rewards</p>
                    <p className="font-bold text-[#00C48C]">
                      {parseFloat(position.pendingRewards).toFixed(4)} PANBOO
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#00C48C]" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activity yet. Start by swapping tokens, providing liquidity, or donating to charity!
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, index) => (
                <div
                  key={`${item.txHash}-${index}`}
                  className="flex items-center justify-between p-4 bg-muted rounded-md hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getEventIcon(item.type)}
                    <div>
                      <p className="font-medium">{getEventLabel(item.type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(item.timestamp)}
                        {item.poolId !== null && ` • Pool #${item.poolId}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium">
                        {parseFloat(item.amount).toFixed(4)}{' '}
                        {item.type === 'donation' ? 'BNB' : item.type === 'swap' ? 'BNB' : 'LP'}
                      </p>
                      {item.amountUsd && (
                        <p className="text-xs text-muted-foreground">
                          ${parseFloat(item.amountUsd).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <a
                      href={`https://bscscan.com/tx/${item.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00C48C] hover:text-[#00C48C]/80"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
