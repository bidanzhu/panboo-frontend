import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFarmPools, useFarmActions } from '@/hooks';
import { useAccount } from 'wagmi';
import { formatUSD } from '@/utils';
import { Sprout, TrendingUp } from 'lucide-react';

export function Farms() {
  const { address } = useAccount();
  const { data: pools, isLoading } = useFarmPools();
  const { harvestAll, actionState } = useFarmActions();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sprout className="w-6 h-6 text-[#00C48C]" />
                Farms
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Stake LP tokens to earn PANBOO rewards
              </p>
            </div>

            {address && pools && pools.length > 0 && (
              <Button
                onClick={() => harvestAll(pools.map(p => p.pid))}
                disabled={actionState.step !== 'idle'}
              >
                {actionState.step === 'harvesting' ? 'Harvesting...' : 'Harvest All'}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Farms Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !pools || pools.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No farms available yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Pool</th>
                    <th className="text-right p-4">TVL</th>
                    <th className="text-right p-4">APR</th>
                    <th className="text-right p-4">Your Stake</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pools.map((pool) => (
                    <tr key={pool.pid} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-4">
                        <div className="font-medium">{pool.name}</div>
                      </td>
                      <td className="text-right p-4">
                        {formatUSD(parseFloat(pool.tvlUsd))}
                      </td>
                      <td className="text-right p-4">
                        <div className="flex items-center justify-end gap-1 text-[#00C48C]">
                          <TrendingUp className="w-4 h-4" />
                          {pool.aprPct}%
                        </div>
                      </td>
                      <td className="text-right p-4 text-muted-foreground">
                        --
                      </td>
                      <td className="text-right p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm">Stake</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
