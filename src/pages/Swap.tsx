import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAccount } from 'wagmi';
import { ADDRESSES } from '@/contracts/addresses';
import { Info } from 'lucide-react';

export function Swap() {
  const { isConnected } = useAccount();

  const swapUrl = `https://pancakeswap.finance/swap?outputCurrency=${ADDRESSES.PANBOO_TOKEN}&chain=bsc`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="mb-6 gradient-card-accent border-glow">
        <CardHeader>
          <CardTitle className="text-2xl">Swap PANBOO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-[#00C48C]/10 border border-[#00C48C]/30 rounded-lg mb-4">
            <Info className="w-5 h-5 text-[#00C48C] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-foreground mb-1 font-semibold">
                Buy or sell PANBOO directly on PancakeSwap
              </p>
              <p className="text-xs text-muted-foreground">
                💡 Tip: Set slippage to 1-2% for best results
              </p>
              <p className="text-xs text-[#00C48C] mt-1 font-medium">
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
      <div className="relative w-full border-glow rounded-xl overflow-hidden" style={{ paddingBottom: '660px' }}>
        <iframe
          src={swapUrl}
          className="absolute top-0 left-0 w-full h-full"
          title="PancakeSwap"
        />
      </div>
    </div>
  );
}
