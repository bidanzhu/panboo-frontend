import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAccount } from 'wagmi';
import { ADDRESSES } from '@/contracts/addresses';
import { Info } from 'lucide-react';

export function Swap() {
  const { isConnected } = useAccount();

  const swapUrl = `https://pancakeswap.finance/swap?outputCurrency=${ADDRESSES.PANBOO_TOKEN}&chain=bsc`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Swap PANBOO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-md mb-4">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-400 mb-1">
                Buy or sell PANBOO directly on PancakeSwap
              </p>
              <p className="text-xs text-blue-300">
                💡 Tip: Set slippage to 1-2% for best results
              </p>
              <p className="text-xs text-blue-300 mt-1">
                Every trade contributes to charity
              </p>
            </div>
          </div>

          {!isConnected && (
            <div className="text-center py-8 text-muted-foreground">
              Please connect your wallet to swap
            </div>
          )}
        </CardContent>
      </Card>

      {/* PancakeSwap Iframe */}
      <div className="relative w-full" style={{ paddingBottom: '660px' }}>
        <iframe
          src={swapUrl}
          className="absolute top-0 left-0 w-full h-full rounded-lg border"
          title="PancakeSwap"
        />
      </div>
    </div>
  );
}
