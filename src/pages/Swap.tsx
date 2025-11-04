import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ADDRESSES } from '@/contracts/addresses';
import { Info, TrendingUp, TrendingDown, Heart, ExternalLink, AlertCircle } from 'lucide-react';

export function Swap() {
  // PancakeSwap URLs with preset tokens and chain
  const buyUrl = `https://pancakeswap.finance/swap?chain=bsc&outputCurrency=${ADDRESSES.PANBOO_TOKEN}&inputCurrency=BNB`;
  const sellUrl = `https://pancakeswap.finance/swap?chain=bsc&inputCurrency=${ADDRESSES.PANBOO_TOKEN}&outputCurrency=BNB`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <Card className="mb-6 bg-gradient-to-br from-[#00C48C]/5 to-[#00C48C]/10 border-[#00C48C]/20">
        <CardHeader>
          <CardTitle className="text-3xl flex items-center gap-3">
            <div className="p-2 bg-[#00C48C]/20 rounded-lg">
              <TrendingUp className="w-8 h-8 text-[#00C48C]" />
            </div>
            Buy or Sell PANBOO
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Trade PANBOO tokens on PancakeSwap with pre-configured settings
          </p>
        </CardHeader>
      </Card>

      {/* Trading Buttons */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Buy Card */}
        <Card className="border-[#00C48C]/30 hover:border-[#00C48C]/60 transition-all group">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#00C48C]/20 rounded-lg group-hover:bg-[#00C48C]/30 transition-colors">
                <TrendingUp className="w-6 h-6 text-[#00C48C]" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Buy PANBOO</h3>
                <p className="text-sm text-muted-foreground">BNB → PANBOO</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-foreground">Buy Tax:</span>
                <span className="text-lg font-bold text-[#00C48C]">3%</span>
              </div>
              <p className="text-xs text-muted-foreground">Applied on all purchases</p>
            </div>

            <a href={buyUrl} target="_blank" rel="noopener noreferrer" className="block">
              <Button className="w-full bg-[#00C48C] hover:bg-[#00C48C]/90 text-white font-semibold text-lg py-6 gap-2">
                Buy on PancakeSwap
                <ExternalLink className="w-5 h-5" />
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Sell Card */}
        <Card className="border-orange-500/30 hover:border-orange-500/60 transition-all group">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition-colors">
                <TrendingDown className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Sell PANBOO</h3>
                <p className="text-sm text-muted-foreground">PANBOO → BNB</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-foreground">Sell Tax:</span>
                <span className="text-lg font-bold text-orange-500">7%</span>
              </div>
              <p className="text-xs text-muted-foreground">Applied on all sales</p>
            </div>

            <a href={sellUrl} target="_blank" rel="noopener noreferrer" className="block">
              <Button className="w-full bg-orange-500 hover:bg-orange-500/90 text-white font-semibold text-lg py-6 gap-2">
                Sell on PancakeSwap
                <ExternalLink className="w-5 h-5" />
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Tax Information */}
      <Card className="mb-6 bg-gradient-to-br from-[#00C48C]/5 to-purple-500/5 border-[#00C48C]/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 mb-4">
            <Heart className="w-6 h-6 text-[#00C48C] flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold mb-2">Where Do Taxes Go?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Every transaction automatically contributes to real-world charity. Here's the breakdown:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-[#00C48C] font-bold mt-0.5">•</span>
                  <span><strong className="text-foreground">Buy (3%):</strong> <span className="text-muted-foreground">2% to charity wallet, 1% to liquidity</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold mt-0.5">•</span>
                  <span><strong className="text-foreground">Sell (7%):</strong> <span className="text-muted-foreground">5% to charity wallet, 2% to liquidity</span></span>
                </li>
              </ul>
              <p className="text-xs text-[#00C48C] mt-3 font-medium">
                All charity donations are transparently tracked on the blockchain
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slippage Guide */}
      <Card className="border-blue-500/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2 text-blue-400">Slippage Settings</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Due to buy/sell taxes, you'll need to set appropriate slippage tolerance on PancakeSwap:
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-[#00C48C]/10 rounded-lg border border-[#00C48C]/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">For Buying:</span>
                    <span className="text-lg font-bold text-[#00C48C]">4-5%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum 4% (3% tax + 1% buffer)</p>
                </div>

                <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">For Selling:</span>
                    <span className="text-lg font-bold text-orange-500">8-9%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum 8% (7% tax + 1% buffer)</p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <strong className="text-yellow-500">Note:</strong> You'll need to manually set slippage in PancakeSwap settings (⚙️ icon).
                  The transaction will fail if slippage is set too low.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>Need help? Check our <a href="/charity" className="text-[#00C48C] hover:underline">Charity Impact</a> page to see your contributions in action</p>
      </div>
    </div>
  );
}
