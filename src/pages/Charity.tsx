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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Total Donated (BNB)</p>
            {isSummaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">
                {summary ? formatBNB(summary.totalDonatedBnb) : '--'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Total Donated (USD)</p>
            {isSummaryLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-[#00C48C]">
                {summary ? formatUSD(parseFloat(summary.totalDonatedUsd)) : '--'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Total Donations</p>
            {isSummaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">
                {summary ? summary.txCount : '--'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charity Wallet */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Charity Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1 font-mono text-sm bg-muted p-3 rounded-md break-all">
              {ADDRESSES.CHARITY_WALLET}
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyAddress}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>

              <a
                href={getBscScanUrl(ADDRESSES.CHARITY_WALLET, 'address')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on BscScan
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Donations */}
      <Card>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Wallet</th>
                    <th className="text-right p-4">Amount</th>
                    <th className="text-right p-4">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((donation) => (
                    <tr
                      key={donation.txHash}
                      className="border-b last:border-0 hover:bg-yellow-500/5"
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
                      <td className="text-right p-4 font-medium text-yellow-500">
                        {donation.amountBnb ? formatBNB(donation.amountBnb) : '--'}
                      </td>
                      <td className="text-right p-4 text-sm text-muted-foreground">
                        {formatRelativeTime(donation.timestamp)}
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
