import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFarmPools, useFarmActions } from '@/hooks';
import { useAccount, useChainId } from 'wagmi';
import { formatUSD } from '@/utils';
import { Sprout, TrendingUp, AlertCircle } from 'lucide-react';
import { isUsingPlaceholders } from '@/contracts/addresses';

export function Farms() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: pools, isLoading } = useFarmPools();
  const { harvestAll, actionState } = useFarmActions();

  const usingPlaceholders = isUsingPlaceholders();
  const isWrongChain = chainId !== 56 && chainId !== 97;
  const writesDisabled = usingPlaceholders || isWrongChain;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Warning Banner */}
      {writesDisabled && (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-400 font-medium">
                Farm operations are currently disabled
              </p>
              <p className="text-xs text-yellow-300 mt-1">
                {isWrongChain
                  ? 'Please switch to BSC network to interact with farms'
                  : 'Real contract addresses required. Smart contracts will be deployed soon.'}
              </p>
            </div>
          </div>
        </div>
      )}

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
                disabled={actionState.step !== 'idle' || writesDisabled}
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
                          <Button size="sm" disabled={writesDisabled}>
                            Stake
                          </Button>
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
