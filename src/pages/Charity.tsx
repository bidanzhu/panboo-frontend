import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCharitySummary, useRecentDonations } from '@/hooks';
import { formatBNB, formatUSD, formatAddress, formatRelativeTime, getBscScanUrl, copyToClipboard } from '@/utils';
import { ADDRESSES } from '@/contracts/addresses';
import { Heart, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export function Charity() {
  const { data: summary, isLoading: isSummaryLoading } = useCharitySummary();
  const { data: donations, isLoading: isDonationsLoading } = useRecentDonations(10);

  const handleCopyAddress = () => {
    copyToClipboard(ADDRESSES.CHARITY_WALLET);
    toast.success('Charity wallet address copied!');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
          <Heart className="w-8 h-8 text-[#00C48C]" />
          Charity Impact
        </h1>
        <p className="text-muted-foreground">
          Transparent donations powered by blockchain
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="gradient-card hover:border-[#00C48C]/30 transition-all group">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Total Donated (BNB)</p>
            {isSummaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold group-hover:text-[#00C48C] transition-colors">
                {summary ? formatBNB(summary.totalDonatedBnb) : '--'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="gradient-card-accent border-glow hover:border-[#00C48C]/40 transition-all group">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Total Donated (USD)</p>
            {isSummaryLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-[#00C48C] glow-green-sm">
                {summary ? formatUSD(parseFloat(summary.totalDonatedUsd)) : '--'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="gradient-card hover:border-[#00C48C]/30 transition-all group">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Total Donations</p>
            {isSummaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold group-hover:text-[#00C48C] transition-colors">
                {summary ? summary.txCount : '--'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="gradient-card hover:border-[#00C48C]/30 transition-all group border-orange-500/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Pending Pledges</p>
            {isSummaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <p className="text-2xl font-bold text-orange-400 group-hover:text-orange-300 transition-colors">
                  {summary?.pendingPledges ? parseFloat(summary.pendingPledges).toFixed(2) : '--'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">PANBOO to swap</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charity Wallet */}
      <Card className="mb-8 gradient-card-accent border-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#00C48C]" />
            Charity Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1 font-mono text-sm bg-[#00C48C]/5 border border-[#00C48C]/20 p-3 rounded-md break-all">
              {ADDRESSES.CHARITY_WALLET}
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyAddress} className="border-[#00C48C]/30 hover:border-[#00C48C]/60 hover:bg-[#00C48C]/10">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>

              <a
                href={getBscScanUrl(ADDRESSES.CHARITY_WALLET, 'address')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline" className="border-[#00C48C]/30 hover:border-[#00C48C]/60 hover:bg-[#00C48C]/10">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on BscScan
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Donations */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle>Recent Donations</CardTitle>
        </CardHeader>
        <CardContent>
          {isDonationsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !donations || donations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No donations yet
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Wallet</th>
                      <th className="text-right p-4">Amount</th>
                      <th className="text-right p-4">Time</th>
                      <th className="text-right p-4">Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((donation) => (
                      <tr
                        key={donation.txHash}
                        className="border-b border-border/50 last:border-0 hover:bg-[#00C48C]/5 transition-colors"
                      >
                        <td className="p-4">
                          <a
                            href={getBscScanUrl(donation.wallet, 'address')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm hover:text-[#00C48C] transition-colors"
                          >
                            {formatAddress(donation.wallet)}
                          </a>
                        </td>
                        <td className="text-right p-4 font-semibold text-[#00C48C]">
                          {donation.amountBnb ? formatBNB(donation.amountBnb) : '--'}
                        </td>
                        <td className="text-right p-4 text-sm text-muted-foreground">
                          {formatRelativeTime(donation.timestamp)}
                        </td>
                        <td className="text-right p-4">
                          <a
                            href={getBscScanUrl(donation.txHash, 'tx')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#00C48C] hover:text-[#00C48C]/80 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {donations.map((donation) => (
                  <div
                    key={donation.txHash}
                    className="p-4 border border-border/50 rounded-lg bg-muted/30 hover:bg-[#00C48C]/5 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Wallet</div>
                        <a
                          href={getBscScanUrl(donation.wallet, 'address')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm hover:text-[#00C48C] transition-colors break-all"
                        >
                          {formatAddress(donation.wallet)}
                        </a>
                      </div>
                      <a
                        href={getBscScanUrl(donation.txHash, 'tx')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00C48C] hover:text-[#00C48C]/80 transition-colors ml-2 flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Amount</div>
                        <div className="font-semibold text-[#00C48C]">
                          {donation.amountBnb ? formatBNB(donation.amountBnb) : '--'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          {formatRelativeTime(donation.timestamp)}
                        </div>
                      </div>
                    </div>
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
