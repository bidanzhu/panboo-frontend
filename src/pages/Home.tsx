import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTokenPrice, useCharitySummary, useFarmsSummary } from '@/hooks';
import { formatUSD } from '@/utils';
import { TrendingUp, Heart, Lock, Leaf, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PriceChart } from '@/components/charts/PriceChart';

export function Home() {
  const { data: tokenPrice, isLoading: isPriceLoading } = useTokenPrice();
  const { data: charitySummary, isLoading: isCharityLoading } = useCharitySummary();
  const { data: farmsSummary, isLoading: isFarmsLoading } = useFarmsSummary();

  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-x-hidden">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Left: Hero Text */}
          <div className="max-w-full">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              Trade · Earn
              <br />
              · Donate ·
              <br />
              All in One
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Every trade powers real-world charity through Panboo on BNB Smart Chain.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link to="/swap">
                <Button size="lg" className="gap-2 bg-[#00C48C] hover:bg-[#00C48C]/90 text-white font-semibold glow-green-sm">
                  Buy PANBOO
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>

              <Link to="/charity">
                <Button size="lg" variant="outline" className="border-[#00C48C]/30 hover:border-[#00C48C]/60 hover:bg-[#00C48C]/10 transition-all">
                  View Charity Impact
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Animated Gradient Circle Icon */}
          <div className="flex justify-center items-center">
            <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
              {/* Animated outer glow */}
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00C48C]/20 to-emerald-600/20 blur-3xl"
                style={{
                  animation: 'pulse 4s ease-in-out infinite'
                }}
              />

              {/* Gradient circles with rotation animation */}
              <svg
                className="w-full h-full"
                viewBox="0 0 400 400"
                style={{
                  animation: 'rotate 20s linear infinite'
                }}
              >
                {/* Outer circle */}
                <circle
                  cx="200"
                  cy="200"
                  r="180"
                  fill="none"
                  stroke="url(#gradient1)"
                  strokeWidth="2"
                  opacity="0.3"
                  style={{
                    animation: 'pulse 3s ease-in-out infinite'
                  }}
                />

                {/* Middle circle */}
                <circle
                  cx="200"
                  cy="200"
                  r="140"
                  fill="none"
                  stroke="url(#gradient2)"
                  strokeWidth="2"
                  opacity="0.5"
                  style={{
                    animation: 'pulse 3s ease-in-out infinite 0.5s'
                  }}
                />

                {/* Inner circle with gradient fill */}
                <circle
                  cx="200"
                  cy="200"
                  r="100"
                  fill="url(#gradient3)"
                  opacity="0.8"
                  style={{
                    animation: 'pulse 3s ease-in-out infinite 1s'
                  }}
                />

                {/* Heart shape in center with pulsing animation */}
                <g
                  style={{
                    animation: 'heartbeat 1.5s ease-in-out infinite',
                    transformOrigin: '200px 200px'
                  }}
                >
                  {/* Proper heart SVG path with rounded lobes */}
                  <path
                    d="M 200,215
                       L 185,200
                       C 182,197 180,193 180,188
                       C 180,183 183,178 188,178
                       C 193,178 197,182 200,186
                       C 203,182 207,178 212,178
                       C 217,178 220,183 220,188
                       C 220,193 218,197 215,200
                       L 200,215 Z"
                    fill="#FF1744"
                    stroke="#D50000"
                    strokeWidth="1.5"
                  />
                </g>

                {/* Gradients */}
                <defs>
                  <radialGradient id="gradient1">
                    <stop offset="0%" stopColor="#00C48C" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
                  </radialGradient>
                  <radialGradient id="gradient2">
                    <stop offset="0%" stopColor="#00C48C" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#047857" stopOpacity="0.4" />
                  </radialGradient>
                  <radialGradient id="gradient3">
                    <stop offset="0%" stopColor="#00C48C" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.9" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Price"
            value={tokenPrice ? formatUSD(parseFloat(tokenPrice.panbooPerUsd), 6) : '--'}
            isLoading={isPriceLoading}
          />

          <StatsCard
            icon={<Heart className="w-6 h-6" />}
            label="Donated"
            value={charitySummary ? formatUSD(parseFloat(charitySummary.totalDonatedUsd)) : '--'}
            isLoading={isCharityLoading}
          />

          <StatsCard
            icon={<Lock className="w-6 h-6" />}
            label="TVL"
            value={farmsSummary ? formatUSD(parseFloat(farmsSummary.totalTvlUsd)) : '--'}
            isLoading={isFarmsLoading}
          />

          <StatsCard
            icon={<Leaf className="w-6 h-6" />}
            label="Active Farms"
            value={farmsSummary ? farmsSummary.activePools.toString() : '--'}
            isLoading={isFarmsLoading}
          />
        </div>

        {/* Price Chart */}
        <div className="mt-12">
          <PriceChart hours={24} />
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(0, -8px);
          }
        }

        @keyframes heartbeat {
          0%, 100% {
            transform: scale(1);
          }
          10% {
            transform: scale(1.1);
          }
          20% {
            transform: scale(1);
          }
          30% {
            transform: scale(1.1);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLoading: boolean;
}

function StatsCard({ icon, label, value, isLoading }: StatsCardProps) {
  return (
    <Card className="gradient-card hover:border-[#00C48C]/30 transition-all duration-300 group">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-[#00C48C] p-2 bg-[#00C48C]/10 rounded-lg group-hover:bg-[#00C48C]/20 transition-colors">
            {icon}
          </div>
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
        </div>
        {isLoading ? (
          <Skeleton className="h-10 w-32" />
        ) : (
          <p className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
