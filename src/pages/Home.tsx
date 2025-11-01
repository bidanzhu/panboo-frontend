import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTokenPrice, useCharitySummary, useFarmsSummary } from '@/hooks';
import { formatUSD } from '@/utils';
import { ArrowRight, TrendingUp, Heart, Droplets, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  const { data: tokenPrice, isLoading: isPriceLoading } = useTokenPrice();
  const { data: charitySummary, isLoading: isCharityLoading } = useCharitySummary();
  const { data: farmsSummary, isLoading: isFarmsLoading } = useFarmsSummary();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#00C48C] to-green-600 bg-clip-text text-transparent">
          Trade | Earn | Donate
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          All in One Transparent DeFi for Charity Platform
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/swap">
            <Button size="lg" className="gap-2">
              Buy PANBOO
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>

          <Link to="/charity">
            <Button size="lg" variant="outline" className="gap-2">
              <Heart className="w-4 h-4" />
              View Charity Impact
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <SummaryCard
          title="PANBOO Price"
          value={tokenPrice ? formatUSD(parseFloat(tokenPrice.panbooPerUsd), 6) : '--'}
          isLoading={isPriceLoading}
          icon={<TrendingUp className="w-5 h-5" />}
        />

        <SummaryCard
          title="Total Donated"
          value={charitySummary ? formatUSD(parseFloat(charitySummary.totalDonatedUsd)) : '--'}
          isLoading={isCharityLoading}
          icon={<Heart className="w-5 h-5" />}
        />

        <SummaryCard
          title="Total TVL"
          value={farmsSummary ? formatUSD(parseFloat(farmsSummary.totalTvlUsd)) : '--'}
          isLoading={isFarmsLoading}
          icon={<Droplets className="w-5 h-5" />}
        />

        <SummaryCard
          title="Active Farms"
          value={farmsSummary ? farmsSummary.activePools.toString() : '--'}
          isLoading={isFarmsLoading}
          icon={<Leaf className="w-5 h-5" />}
        />
      </div>

      {/* About Section */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>About Panboo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Panboo is a revolutionary DeFi platform on BNB Smart Chain that combines trading,
            yield farming, and charitable giving. Every transaction contributes to verified
            charity wallets, creating a transparent and impactful ecosystem.
          </p>
          <Button variant="outline">Learn More</Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  isLoading: boolean;
  icon: React.ReactNode;
}

function SummaryCard({ title, value, isLoading, icon }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="text-[#00C48C]">{icon}</div>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
