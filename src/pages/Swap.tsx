import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ADDRESSES } from '@/contracts/addresses';
import { Info, TrendingUp, TrendingDown, Heart, ExternalLink, AlertCircle, Calculator, Copy, Check, FileCode } from 'lucide-react';
import { useTokenPrice } from '@/hooks';
import { useState } from 'react';
import { formatNumber } from '@/utils';
import { toast } from 'sonner';

export function Swap() {
  const [bnbAmount, setBnbAmount] = useState('1');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const { data: tokenPrice } = useTokenPrice();

  // PancakeSwap URLs with preset tokens and chain
  const buyUrl = `https://pancakeswap.finance/swap?chain=bsc&outputCurrency=${ADDRESSES.PANBOO_TOKEN}&inputCurrency=BNB`;
  const sellUrl = `https://pancakeswap.finance/swap?chain=bsc&inputCurrency=${ADDRESSES.PANBOO_TOKEN}&outputCurrency=BNB`;

  // Copy address to clipboard
  const copyToClipboard = async (address: string, label: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      toast.error('Failed to copy address');
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Calculate amounts
  const bnbValue = parseFloat(bnbAmount) || 0;
  const panbooPerBnb = parseFloat(tokenPrice?.panbooPerBnb || '0');
  const panbooPerUsd = parseFloat(tokenPrice?.panbooPerUsd || '0');
  const bnbPerUsd = parseFloat(tokenPrice?.bnbPerUsd || '0');

  const grossPanboo = bnbValue * panbooPerBnb;
  const taxAmount = grossPanboo * 0.03; // 3% buy tax
  const netPanboo = grossPanboo - taxAmount;
  const charityUsd = taxAmount * panbooPerUsd;
  const spendingUsd = bnbValue * bnbPerUsd;

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

      {/* Quick Buy Calculator */}
      <Card className="mb-8 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-400" />
            Quick Buy Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Input */}
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                I want to spend:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={bnbAmount}
                  onChange={(e) => setBnbAmount(e.target.value)}
                  placeholder="1.0"
                  step="0.1"
                  min="0"
                  className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                />
                <div className="px-4 py-3 bg-muted border border-border rounded-lg font-bold text-lg">
                  BNB
                </div>
              </div>
              {bnbValue > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ ${spendingUsd.toFixed(2)} USD
                </p>
              )}
            </div>

            {/* Results */}
            {bnbValue > 0 && tokenPrice && (
              <div className="pt-4 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#00C48C]/10 rounded-lg border border-[#00C48C]/30">
                  <span className="text-sm text-muted-foreground">You'll receive:</span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#00C48C]">
                      {formatNumber(netPanboo, 0)} PANBOO
                    </div>
                    <div className="text-xs text-muted-foreground">
                      after 3% tax
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                  <span className="text-sm text-muted-foreground">Buy tax (3%):</span>
                  <div className="text-right">
                    <div className="text-base font-semibold text-orange-400">
                      {formatNumber(taxAmount, 0)} PANBOO
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    Charity contribution:
                  </span>
                  <div className="text-right">
                    <div className="text-base font-semibold text-purple-400">
                      ${charityUsd.toFixed(4)} USD
                    </div>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    💡 Price: 1 BNB = {formatNumber(panbooPerBnb, 0)} PANBOO
                  </p>
                </div>
              </div>
            )}

            {!tokenPrice && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Loading price data...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contract Addresses */}
      <Card className="mb-8 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-400" />
            Contract Addresses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* PANBOO Token */}
            <div className="p-4 bg-muted/50 rounded-lg border border-border hover:border-blue-500/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">PANBOO Token</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(ADDRESSES.PANBOO_TOKEN, 'Token address')}
                    className="p-2 hover:bg-accent rounded-md transition-colors"
                    title="Copy address"
                  >
                    {copiedAddress === ADDRESSES.PANBOO_TOKEN ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                  <a
                    href={`https://bscscan.com/address/${ADDRESSES.PANBOO_TOKEN}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-accent rounded-md transition-colors"
                    title="View on BSCScan"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </a>
                </div>
              </div>
              <code className="text-xs text-muted-foreground font-mono block">
                {ADDRESSES.PANBOO_TOKEN}
              </code>
            </div>

            {/* LP Pair */}
            <div className="p-4 bg-muted/50 rounded-lg border border-border hover:border-blue-500/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">PANBOO-BNB LP Pair</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(ADDRESSES.PANBOO_BNB_PAIR, 'LP Pair address')}
                    className="p-2 hover:bg-accent rounded-md transition-colors"
                    title="Copy address"
                  >
                    {copiedAddress === ADDRESSES.PANBOO_BNB_PAIR ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                  <a
                    href={`https://bscscan.com/address/${ADDRESSES.PANBOO_BNB_PAIR}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-accent rounded-md transition-colors"
                    title="View on BSCScan"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </a>
                </div>
              </div>
              <code className="text-xs text-muted-foreground font-mono block">
                {ADDRESSES.PANBOO_BNB_PAIR}
              </code>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              Verify contract details on BSCScan before trading
            </p>
          </div>
        </CardContent>
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
                100% of all taxes go directly to charity. Here's how it works:
              </p>
              <div className="space-y-3 text-sm mb-3">
                <div className="p-3 bg-[#00C48C]/10 rounded-lg border border-[#00C48C]/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#00C48C] font-bold">•</span>
                    <strong className="text-foreground">Buy Tax (3%)</strong>
                  </div>
                  <p className="text-xs text-muted-foreground ml-5">
                    All 3% is collected, automatically swapped to BNB, and sent to charity wallet
                  </p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-orange-500 font-bold">•</span>
                    <strong className="text-foreground">Sell Tax (7%)</strong>
                  </div>
                  <p className="text-xs text-muted-foreground ml-5">
                    All 7% is collected, automatically swapped to BNB, and sent to charity wallet
                  </p>
                </div>
              </div>
              <p className="text-xs text-[#00C48C] font-medium">
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
