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
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-300 font-semibold">
                Farm operations are currently disabled
              </p>
              <p className="text-xs text-yellow-200/80 mt-1">
                {isWrongChain
                  ? 'Please switch to BSC network to interact with farms'
                  : 'Real contract addresses required. Smart contracts will be deployed soon.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <Card className="mb-8 bg-gradient-to-br from-[#00C48C]/5 to-[#00C48C]/10 border-[#00C48C]/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-[#00C48C]/20 rounded-lg">
                  <Sprout className="w-6 h-6 text-[#00C48C]" />
                </div>
                <span className="text-2xl">Farms</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-3 ml-14">
                Stake LP tokens to earn PANBOO rewards
              </p>
            </div>

            {address && pools && pools.length > 0 && (
              <Button
                onClick={() => harvestAll(pools.map(p => p.pid))}
                disabled={actionState.step !== 'idle' || writesDisabled}
                className="bg-[#00C48C] hover:bg-[#00C48C]/90 text-white font-semibold px-6"
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
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pool</th>
                      <th className="text-right p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">TVL</th>
                      <th className="text-right p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">APR</th>
                      <th className="text-right p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Stake</th>
                      <th className="text-right p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pools.map((pool) => (
                      <tr key={pool.pid} className="border-b border-border/50 last:border-0 hover:bg-[#00C48C]/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#00C48C]/10 rounded-lg">
                              <Sprout className="w-5 h-5 text-[#00C48C]" />
                            </div>
                            <div>
                              <div className="font-semibold text-base">{pool.name}</div>
                              <div className="text-xs text-muted-foreground">Pool #{pool.pid}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right p-4">
                          <div className="font-semibold text-base">{formatUSD(parseFloat(pool.tvlUsd))}</div>
                        </td>
                        <td className="text-right p-4">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00C48C]/10 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-[#00C48C]" />
                            <span className="font-bold text-[#00C48C]">{pool.aprPct}%</span>
                          </div>
                        </td>
                        <td className="text-right p-4 text-muted-foreground font-medium">
                          --
                        </td>
                        <td className="text-right p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={writesDisabled}
                              className="bg-[#00C48C] hover:bg-[#00C48C]/90 text-white font-semibold"
                            >
                              Stake
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {pools.map((pool) => (
                  <div key={pool.pid} className="p-4 border border-border/50 rounded-lg bg-muted/30 hover:bg-[#00C48C]/5 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#00C48C]/10 rounded-lg">
                        <Sprout className="w-5 h-5 text-[#00C48C]" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-base">{pool.name}</div>
                        <div className="text-xs text-muted-foreground">Pool #{pool.pid}</div>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00C48C]/10 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-[#00C48C]" />
                        <span className="font-bold text-[#00C48C]">{pool.aprPct}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs mb-1">TVL</div>
                        <div className="font-semibold">{formatUSD(parseFloat(pool.tvlUsd))}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs mb-1">Your Stake</div>
                        <div className="font-medium text-muted-foreground">--</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={writesDisabled}
                      className="w-full bg-[#00C48C] hover:bg-[#00C48C]/90 text-white font-semibold"
                    >
                      Stake
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
