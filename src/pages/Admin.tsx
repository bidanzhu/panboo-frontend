import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ADDRESSES } from '@/contracts/addresses';
import { PANBOO_TOKEN_ABI } from '@/contracts/abis';
import { parseUnits, formatUnits } from 'ethers';
import { Shield, AlertCircle, Settings, Heart, Zap, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useChainReady } from '@/hooks';
import { formatAddress } from '@/utils';

export function Admin() {
  const { address, isConnected } = useAccount();
  const { ensureReady } = useChainReady();

  // Read contract owner
  const { data: contractOwner } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'owner',
  });

  // Read current settings
  const { data: buyTaxBps, refetch: refetchBuyTax } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'buyTaxBps',
  });

  const { data: sellTaxBps, refetch: refetchSellTax } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'sellTaxBps',
  });

  const { data: swapThreshold, refetch: refetchThreshold } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'swapThreshold',
  });

  const { data: charityWallet, refetch: refetchCharityWallet } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'charityWallet',
  });

  const { data: swapEnabled, refetch: refetchSwapEnabled } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'swapEnabled',
  });

  // Form states
  const [newBuyTax, setNewBuyTax] = useState('');
  const [newSellTax, setNewSellTax] = useState('');
  const [newCharityWallet, setNewCharityWallet] = useState('');
  const [newSwapThreshold, setNewSwapThreshold] = useState('');

  // Update form when data loads
  useEffect(() => {
    if (buyTaxBps !== undefined) {
      setNewBuyTax((Number(buyTaxBps) / 100).toString());
    }
    if (sellTaxBps !== undefined) {
      setNewSellTax((Number(sellTaxBps) / 100).toString());
    }
    if (swapThreshold !== undefined) {
      setNewSwapThreshold(formatUnits(swapThreshold as bigint, 18));
    }
    if (charityWallet) {
      setNewCharityWallet(charityWallet as string);
    }
  }, [buyTaxBps, sellTaxBps, swapThreshold, charityWallet]);

  const { writeContractAsync } = useWriteContract();
  const [pendingTx, setPendingTx] = useState<string | null>(null);

  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: pendingTx as `0x${string}` | undefined,
  });

  // Check if user is owner
  const isOwner = isConnected && address && contractOwner &&
    address.toLowerCase() === (contractOwner as string).toLowerCase();

  // Update tax rates
  const handleUpdateTaxRates = async () => {
    if (!ensureReady()) return;

    try {
      const buyBps = Math.floor(parseFloat(newBuyTax) * 100);
      const sellBps = Math.floor(parseFloat(newSellTax) * 100);

      if (buyBps > 1000 || sellBps > 1000) {
        toast.error('Tax rates cannot exceed 10%');
        return;
      }

      if (buyBps < 0 || sellBps < 0) {
        toast.error('Tax rates cannot be negative');
        return;
      }

      toast.info('Updating tax rates...');

      const hash = await writeContractAsync({
        address: ADDRESSES.PANBOO_TOKEN,
        abi: PANBOO_TOKEN_ABI,
        functionName: 'setTaxRates',
        args: [BigInt(buyBps), BigInt(sellBps)],
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 3000));
      refetchBuyTax();
      refetchSellTax();
      toast.success(`Tax rates updated: ${newBuyTax}% buy, ${newSellTax}% sell`);
    } catch (error: any) {
      console.error('Error updating tax rates:', error);
      toast.error(error?.message || 'Failed to update tax rates');
    }
  };

  // Update charity wallet
  const handleUpdateCharityWallet = async () => {
    if (!ensureReady()) return;

    try {
      if (!newCharityWallet || !newCharityWallet.startsWith('0x')) {
        toast.error('Invalid wallet address');
        return;
      }

      toast.info('Updating charity wallet...');

      const hash = await writeContractAsync({
        address: ADDRESSES.PANBOO_TOKEN,
        abi: PANBOO_TOKEN_ABI,
        functionName: 'setCharityWallet',
        args: [newCharityWallet as `0x${string}`],
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(resolve => setTimeout(resolve, 3000));
      refetchCharityWallet();
      toast.success('Charity wallet updated!');
    } catch (error: any) {
      console.error('Error updating charity wallet:', error);
      toast.error(error?.message || 'Failed to update charity wallet');
    }
  };

  // Update swap threshold
  const handleUpdateSwapThreshold = async () => {
    if (!ensureReady()) return;

    try {
      const thresholdBN = parseUnits(newSwapThreshold, 18);

      toast.info('Updating swap threshold...');

      const hash = await writeContractAsync({
        address: ADDRESSES.PANBOO_TOKEN,
        abi: PANBOO_TOKEN_ABI,
        functionName: 'setSwapThreshold',
        args: [thresholdBN],
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(resolve => setTimeout(resolve, 3000));
      refetchThreshold();
      toast.success(`Swap threshold updated to ${newSwapThreshold} PANBOO`);
    } catch (error: any) {
      console.error('Error updating swap threshold:', error);
      toast.error(error?.message || 'Failed to update swap threshold');
    }
  };

  // Toggle swap enabled
  const handleToggleSwap = async () => {
    if (!ensureReady()) return;

    try {
      const newState = !swapEnabled;
      toast.info(`${newState ? 'Enabling' : 'Disabling'} auto-swap...`);

      const hash = await writeContractAsync({
        address: ADDRESSES.PANBOO_TOKEN,
        abi: PANBOO_TOKEN_ABI,
        functionName: 'setSwapEnabled',
        args: [newState],
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(resolve => setTimeout(resolve, 3000));
      refetchSwapEnabled();
      toast.success(`Auto-swap ${newState ? 'enabled' : 'disabled'}!`);
    } catch (error: any) {
      console.error('Error toggling swap:', error);
      toast.error(error?.message || 'Failed to toggle swap');
    }
  };

  // Manual swap and donate
  const handleManualSwap = async () => {
    if (!ensureReady()) return;

    try {
      toast.info('Triggering manual swap & donate...');

      const hash = await writeContractAsync({
        address: ADDRESSES.PANBOO_TOKEN,
        abi: PANBOO_TOKEN_ABI,
        functionName: 'manualSwapAndDonate',
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(resolve => setTimeout(resolve, 3000));
      toast.success('Manual donation complete! Check charity wallet on BscScan.');
    } catch (error: any) {
      console.error('Error during manual swap:', error);
      toast.error(error?.message || 'Failed to execute manual swap');
    }
  };

  // Not connected
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Admin Panel</h2>
            <p className="text-muted-foreground">
              Please connect your wallet to access the admin panel
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not owner
  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                Only the contract owner can access this panel
              </p>
              <div className="bg-muted p-4 rounded-md inline-block">
                <p className="text-sm text-muted-foreground mb-1">Your wallet:</p>
                <p className="font-mono text-sm">{formatAddress(address || '')}</p>
                <p className="text-sm text-muted-foreground mt-3 mb-1">Contract owner:</p>
                <p className="font-mono text-sm">{formatAddress((contractOwner as string) || '')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Owner view
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          <Shield className="w-8 h-8 text-[#00C48C]" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground">
          Manage PanbooToken contract settings
        </p>
      </div>

      {/* Warning Banner */}
      <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-400 font-medium">
              Owner Access Granted
            </p>
            <p className="text-xs text-yellow-300 mt-1">
              All changes require wallet signature and on-chain transaction. Changes are permanent.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00C48C]" />
              Tax Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Buy Tax (%)
                </label>
                <Input
                  type="number"
                  value={newBuyTax}
                  onChange={(e) => setNewBuyTax(e.target.value)}
                  placeholder="3.0"
                  min="0"
                  max="10"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {buyTaxBps ? (Number(buyTaxBps) / 100).toFixed(1) : '--'}% (Max: 10%)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Sell Tax (%)
                </label>
                <Input
                  type="number"
                  value={newSellTax}
                  onChange={(e) => setNewSellTax(e.target.value)}
                  placeholder="5.0"
                  min="0"
                  max="10"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {sellTaxBps ? (Number(sellTaxBps) / 100).toFixed(1) : '--'}% (Max: 10%)
                </p>
              </div>

              <Button
                onClick={handleUpdateTaxRates}
                disabled={isTxLoading}
                className="w-full"
              >
                {isTxLoading ? 'Updating...' : 'Update Tax Rates'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Charity Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#00C48C]" />
              Charity Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Wallet Address
                </label>
                <Input
                  type="text"
                  value={newCharityWallet}
                  onChange={(e) => setNewCharityWallet(e.target.value)}
                  placeholder="0x..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {charityWallet ? formatAddress(charityWallet as string) : '--'}
                </p>
              </div>

              <Button
                onClick={handleUpdateCharityWallet}
                disabled={isTxLoading}
                className="w-full"
              >
                {isTxLoading ? 'Updating...' : 'Update Charity Wallet'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Swap Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#00C48C]" />
              Swap Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Swap Threshold (PANBOO)
                </label>
                <Input
                  type="number"
                  value={newSwapThreshold}
                  onChange={(e) => setNewSwapThreshold(e.target.value)}
                  placeholder="100000"
                  min="0"
                  step="1000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {swapThreshold ? formatUnits(swapThreshold as bigint, 18) : '--'} PANBOO
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div>
                  <p className="text-sm font-medium">Auto-Swap Enabled</p>
                  <p className="text-xs text-muted-foreground">
                    {swapEnabled ? 'Active' : 'Disabled'}
                  </p>
                </div>
                <Button
                  onClick={handleToggleSwap}
                  disabled={isTxLoading}
                  variant={swapEnabled ? 'destructive' : 'default'}
                  size="sm"
                >
                  {swapEnabled ? 'Disable' : 'Enable'}
                </Button>
              </div>

              <Button
                onClick={handleUpdateSwapThreshold}
                disabled={isTxLoading}
                className="w-full"
              >
                {isTxLoading ? 'Updating...' : 'Update Threshold'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manual Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#00C48C]" />
              Manual Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm font-medium mb-1">Trigger Manual Donation</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Immediately swap all accumulated tax tokens for BNB and send to charity wallet
                </p>
                <Button
                  onClick={handleManualSwap}
                  disabled={isTxLoading}
                  className="w-full"
                  variant="outline"
                >
                  {isTxLoading ? 'Processing...' : 'Swap & Donate Now'}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <p className="font-medium text-blue-400 mb-1">💡 Tip</p>
                <p className="text-blue-300">
                  Manual donations are useful for testing or when you want to send funds immediately without waiting for the threshold.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
