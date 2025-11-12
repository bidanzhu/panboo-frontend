import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Trophy, Heart, TrendingUp, Sprout, Crown, Medal, Award } from 'lucide-react';

interface Donor {
  rank?: number;
  address: string;
  totalBnb: string;
  totalUsd: string;
  donationCount?: number;
  tx_count?: number;
}

interface Trader {
  rank: number;
  address: string;
  totalVolumeBnb: string;
  swapCount: number;
  firstSwap: number;
  lastSwap: number;
}

interface Farmer {
  rank: number;
  address: string;
  totalStaked: string; // Kept for backward compatibility
  totalPanbooDeposited: string; // PANBOO in LP
  totalBnbDeposited: string; // BNB in LP
  totalPendingRewards: string; // Pending PANBOO rewards
  activePools: number;
  lastActivity: number;
}

interface MockFarmer {
  wallet: string;
  totalStaked: string;
  totalPanbooDeposited: string;
  totalBnbDeposited: string;
  rewardsEarned: string;
  poolCount: number;
  rank: number;
}

type LeaderboardTab = 'donors' | 'traders' | 'farmers';

export default function Leaderboard() {
  const { address: userAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('donors');
  const [donors, setDonors] = useState<Donor[]>([]);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
      const useMockData = import.meta.env.VITE_ENABLE_FAKE_DATA === 'true';

      // If mock data is enabled, use fake data
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay

        const mockDonors: Donor[] = [
          { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', totalBnb: '5.5', totalUsd: '1762.75', donationCount: 12, rank: 1 },
          { address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', totalBnb: '3.2', totalUsd: '1025.60', donationCount: 8, rank: 2 },
          { address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', totalBnb: '2.8', totalUsd: '897.40', donationCount: 6, rank: 3 },
          { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', totalBnb: '1.9', totalUsd: '608.95', donationCount: 5, rank: 4 },
          { address: '0x5c69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', totalBnb: '1.3', totalUsd: '416.65', donationCount: 4, rank: 5 },
        ];

        const mockTraders: Trader[] = [
          { address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', totalVolumeBnb: '45.2', swapCount: 128, rank: 1, firstSwap: Date.now() / 1000 - 2592000, lastSwap: Date.now() / 1000 - 1200 },
          { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', totalVolumeBnb: '32.8', swapCount: 95, rank: 2, firstSwap: Date.now() / 1000 - 2592000, lastSwap: Date.now() / 1000 - 3600 },
          { address: '0x5c69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', totalVolumeBnb: '28.5', swapCount: 74, rank: 3, firstSwap: Date.now() / 1000 - 2592000, lastSwap: Date.now() / 1000 - 7200 },
          { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', totalVolumeBnb: '21.3', swapCount: 62, rank: 4, firstSwap: Date.now() / 1000 - 2592000, lastSwap: Date.now() / 1000 - 10800 },
          { address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', totalVolumeBnb: '18.7', swapCount: 51, rank: 5, firstSwap: Date.now() / 1000 - 2592000, lastSwap: Date.now() / 1000 - 14400 },
        ];

        const mockFarmers: MockFarmer[] = [
          {
            wallet: '0x5c69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
            totalStaked: '125000',
            totalPanbooDeposited: '45000',
            totalBnbDeposited: '8.5',
            rewardsEarned: '8250',
            poolCount: 3,
            rank: 1
          },
          {
            wallet: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
            totalStaked: '98500',
            totalPanbooDeposited: '36000',
            totalBnbDeposited: '6.8',
            rewardsEarned: '6420',
            poolCount: 3,
            rank: 2
          },
          {
            wallet: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
            totalStaked: '76000',
            totalPanbooDeposited: '28000',
            totalBnbDeposited: '5.2',
            rewardsEarned: '4980',
            poolCount: 2,
            rank: 3
          },
          {
            wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            totalStaked: '54200',
            totalPanbooDeposited: '20000',
            totalBnbDeposited: '3.7',
            rewardsEarned: '3520',
            poolCount: 2,
            rank: 4
          },
          {
            wallet: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            totalStaked: '42800',
            totalPanbooDeposited: '16000',
            totalBnbDeposited: '3.0',
            rewardsEarned: '2780',
            poolCount: 1,
            rank: 5
          },
        ];

        setDonors(mockDonors);
        setTraders(mockTraders);

        // Map farmers data to include all fields
        const mappedFarmers = mockFarmers.map((f: MockFarmer): Farmer => ({
          rank: f.rank,
          address: f.wallet,
          totalStaked: f.totalStaked,
          totalPanbooDeposited: f.totalPanbooDeposited,
          totalBnbDeposited: f.totalBnbDeposited,
          totalPendingRewards: f.rewardsEarned,
          activePools: f.poolCount,
          lastActivity: Date.now() / 1000,
        }));

        setFarmers(mappedFarmers);
        setIsLoading(false);
        return;
      }

      // Fetch all leaderboards in parallel
      const [donorsRes, tradersRes, farmersRes] = await Promise.all([
        fetch(`${apiUrl}/charity/top?limit=10`),
        fetch(`${apiUrl}/leaderboard/traders?limit=10`),
        fetch(`${apiUrl}/leaderboard/farmers?limit=10`),
      ]);

      if (!donorsRes.ok || !tradersRes.ok || !farmersRes.ok) {
        throw new Error('Failed to fetch leaderboards');
      }

      const [donorsData, tradersData, farmersData] = await Promise.all([
        donorsRes.json(),
        tradersRes.json(),
        farmersRes.json(),
      ]);

      // Add rank to donors (from existing /charity/top endpoint)
      const donorsWithRank = donorsData.map((d: Donor, index: number) => ({
        ...d,
        rank: index + 1,
        donationCount: d.tx_count || d.donationCount || 0,
      }));

      setDonors(donorsWithRank);
      setTraders(tradersData);
      setFarmers(farmersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboards');
      console.error('Error fetching leaderboards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '--';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isCurrentUser = (address: string) => {
    return userAddress && address && address.toLowerCase() === userAddress.toLowerCase();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const renderDonorsTable = () => (
    <div className="space-y-3">
      {donors.map((donor) => (
        <div
          key={donor.address}
          className={`flex items-center justify-between p-4 rounded-md transition-colors ${
            isCurrentUser(donor.address)
              ? 'bg-[#00C48C]/10 border-2 border-[#00C48C]'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-8 flex items-center justify-center">
              {getRankIcon(donor.rank || 0)}
            </div>
            <div>
              <p className="font-medium">
                {formatAddress(donor.address)}
                {isCurrentUser(donor.address) && (
                  <span className="ml-2 text-xs bg-[#00C48C] text-black px-2 py-1 rounded">
                    YOU
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {donor.donationCount} donation{donor.donationCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-[#00C48C]">
              ${parseFloat(donor.totalUsd).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              {parseFloat(donor.totalBnb).toFixed(4)} BNB
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTradersTable = () => (
    <div className="space-y-3">
      {traders.map((trader) => (
        <div
          key={trader.address}
          className={`flex items-center justify-between p-4 rounded-md transition-colors ${
            isCurrentUser(trader.address)
              ? 'bg-[#00C48C]/10 border-2 border-[#00C48C]'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-8 flex items-center justify-center">
              {getRankIcon(trader.rank)}
            </div>
            <div>
              <p className="font-medium">
                {formatAddress(trader.address)}
                {isCurrentUser(trader.address) && (
                  <span className="ml-2 text-xs bg-[#00C48C] text-black px-2 py-1 rounded">
                    YOU
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {trader.swapCount} swap{trader.swapCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-[#00C48C]">
              {parseFloat(trader.totalVolumeBnb).toFixed(4)} BNB
            </p>
            <p className="text-sm text-muted-foreground">Total Volume</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderFarmersTable = () => (
    <div className="space-y-3">
      {farmers.map((farmer) => (
        <div
          key={farmer.address}
          className={`flex items-center justify-between p-4 rounded-md transition-colors ${
            isCurrentUser(farmer.address)
              ? 'bg-[#00C48C]/10 border-2 border-[#00C48C]'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-8 flex items-center justify-center">
              {getRankIcon(farmer.rank)}
            </div>
            <div>
              <p className="font-medium">
                {formatAddress(farmer.address)}
                {isCurrentUser(farmer.address) && (
                  <span className="ml-2 text-xs bg-[#00C48C] text-black px-2 py-1 rounded">
                    YOU
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {farmer.activePools} active pool{farmer.activePools !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-[#00C48C]">
              {parseFloat(farmer.totalPanbooDeposited).toLocaleString()} PANBOO + {parseFloat(farmer.totalBnbDeposited).toFixed(2)} BNB
            </p>
            <p className="text-sm text-orange-400">
              {parseFloat(farmer.totalPendingRewards).toLocaleString()} PANBOO rewards pending
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Trophy className="w-10 h-10 text-[#00C48C]" />
          Leaderboards
        </h1>
        <p className="text-muted-foreground">
          Top contributors, traders, and farmers in the Panboo ecosystem
        </p>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-4 mb-6">
        <Button
          variant={activeTab === 'donors' ? 'default' : 'outline'}
          onClick={() => setActiveTab('donors')}
          className="flex items-center gap-2"
        >
          <Heart className="w-4 h-4" />
          Top Donors
        </Button>
        <Button
          variant={activeTab === 'traders' ? 'default' : 'outline'}
          onClick={() => setActiveTab('traders')}
          className="flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Top Traders
        </Button>
        <Button
          variant={activeTab === 'farmers' ? 'default' : 'outline'}
          onClick={() => setActiveTab('farmers')}
          className="flex items-center gap-2"
        >
          <Sprout className="w-4 h-4" />
          Top Farmers
        </Button>
      </div>

      {/* Content */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {activeTab === 'donors' && <Heart className="w-5 h-5 text-pink-500" />}
            {activeTab === 'traders' && <TrendingUp className="w-5 h-5 text-blue-500" />}
            {activeTab === 'farmers' && <Sprout className="w-5 h-5 text-green-500" />}
            {activeTab === 'donors' && 'Top Charity Donors'}
            {activeTab === 'traders' && 'Top Traders by Volume'}
            {activeTab === 'farmers' && 'Top Farmers by TVL'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading leaderboard...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchLeaderboards}>Retry</Button>
            </div>
          ) : (
            <>
              {activeTab === 'donors' && donors.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No donations yet. Be the first to donate to charity!
                </div>
              )}
              {activeTab === 'traders' && traders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No trading activity yet. Start swapping tokens to climb the leaderboard!
                </div>
              )}
              {activeTab === 'farmers' && farmers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No farmers yet. Provide liquidity and stake to earn rewards!
                </div>
              )}

              {activeTab === 'donors' && donors.length > 0 && renderDonorsTable()}
              {activeTab === 'traders' && traders.length > 0 && renderTradersTable()}
              {activeTab === 'farmers' && farmers.length > 0 && renderFarmersTable()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-500" />
          <span>1st Place</span>
        </div>
        <div className="flex items-center gap-2">
          <Medal className="w-4 h-4 text-gray-400" />
          <span>2nd Place</span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-orange-600" />
          <span>3rd Place</span>
        </div>
      </div>
    </div>
  );
}
