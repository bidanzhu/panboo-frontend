import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface PriceData {
  timestamp: number;
  price: number;
  reservePanboo: string;
  reserveBnb: string;
}

interface PriceStats {
  dataPoints: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  priceChange: string;
  timeRange: {
    from: number;
    to: number;
  };
}

interface VolumeStats {
  totalBnb: number;
  swapCount: number;
  buys: number;
  sells: number;
}

interface PriceChartProps {
  hours?: number;
}

export function PriceChart({ hours = 24 }: PriceChartProps) {
  const [timeRange, setTimeRange] = useState(hours);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [stats, setStats] = useState<PriceStats | null>(null);
  const [volume, setVolume] = useState<VolumeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPriceData();
  }, [timeRange]);

  const fetchPriceData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/token/price/history?hours=${timeRange}`);

      if (!response.ok) {
        throw new Error('Failed to fetch price data');
      }

      const data = await response.json();
      setPriceData(data.prices);
      setStats(data.stats);
      setVolume(data.volume);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart');
      console.error('Error fetching price data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    if (timeRange <= 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatPrice = (price: number) => {
    return price.toFixed(10);
  };

  const chartData = priceData.map(p => ({
    time: formatTimestamp(p.timestamp),
    price: p.price,
    fullTimestamp: new Date(p.timestamp * 1000).toLocaleString(),
  }));

  const priceChangeNum = parseFloat(stats?.priceChange || '0');
  const isPriceUp = priceChangeNum >= 0;

  return (
    <Card className="gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00C48C]" />
            Price Chart
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={timeRange === 1 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(1)}
            >
              1H
            </Button>
            <Button
              variant={timeRange === 24 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(24)}
            >
              24H
            </Button>
            <Button
              variant={timeRange === 168 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(168)}
            >
              7D
            </Button>
            <Button
              variant={timeRange === 720 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(720)}
            >
              30D
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-80">
            <div className="text-muted-foreground">Loading chart...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-80">
            <div className="text-red-500">{error}</div>
          </div>
        ) : priceData.length === 0 ? (
          <div className="flex items-center justify-center h-80">
            <div className="text-muted-foreground">
              No price data available yet. Add liquidity on PancakeSwap to enable tracking.
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                <p className="text-lg font-bold text-[#00C48C]">
                  {formatPrice(priceData[priceData.length - 1]?.price || 0)} BNB
                </p>
              </div>
              <div className="p-4 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground mb-1">{timeRange}h Change</p>
                <p className={`text-lg font-bold flex items-center gap-1 ${isPriceUp ? 'text-green-500' : 'text-red-500'}`}>
                  {isPriceUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {stats?.priceChange || '0%'}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
                <p className="text-lg font-bold">
                  {volume?.totalBnb.toFixed(4) || '0'} BNB
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {volume?.swapCount || 0} swaps
                </p>
              </div>
              <div className="p-4 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Buy/Sell Ratio</p>
                <p className="text-lg font-bold">
                  {volume?.buys || 0} / {volume?.sells || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {volume?.buys && volume?.sells
                    ? ((volume.buys / (volume.buys + volume.sells)) * 100).toFixed(0)
                    : '0'}% buys
                </p>
              </div>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="time"
                  stroke="#888"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#888"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => value.toFixed(10)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#888' }}
                  formatter={(value: number) => [formatPrice(value) + ' BNB', 'Price']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#00C48C"
                  strokeWidth={2}
                  dot={false}
                  name="PANBOO Price"
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
