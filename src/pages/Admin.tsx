import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ADDRESSES } from '@/contracts/addresses';
import { PANBOO_TOKEN_ABI, MASTERCHEF_ABI } from '@/contracts/abis';
import { parseUnits, formatUnits } from 'ethers';
import { Shield, AlertCircle, Settings, Heart, Zap, TrendingUp, Server } from 'lucide-react';
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

  const { data: tradingEnabled, refetch: refetchTradingEnabled } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'tradingEnabled',
  });

  // Read MasterChef settings
  const { data: rewardPerBlock, refetch: refetchRewardPerBlock } = useReadContract({
    address: ADDRESSES.MASTERCHEF,
    abi: MASTERCHEF_ABI,
    functionName: 'rewardPerBlock',
  });

  const { data: poolLength } = useReadContract({
    address: ADDRESSES.MASTERCHEF,
    abi: MASTERCHEF_ABI,
    functionName: 'poolLength',
  });

  const { data: totalAllocPoint, refetch: refetchTotalAllocPoint } = useReadContract({
    address: ADDRESSES.MASTERCHEF,
    abi: MASTERCHEF_ABI,
    functionName: 'totalAllocPoint',
  });

  // Form states (declared early so they can be used in hooks)
  const [newBuyTax, setNewBuyTax] = useState('');
  const [newSellTax, setNewSellTax] = useState('');
  const [newCharityWallet, setNewCharityWallet] = useState('');
  const [newSwapThreshold, setNewSwapThreshold] = useState('');
  const [newEmissionRate, setNewEmissionRate] = useState('');
  const [excludeAddress, setExcludeAddress] = useState('');
  const [checkExcludeAddress, setCheckExcludeAddress] = useState('');
  const [newPoolLpToken, setNewPoolLpToken] = useState('');
  const [newPoolAllocPoint, setNewPoolAllocPoint] = useState('');
  const [updatePoolId, setUpdatePoolId] = useState('');
  const [updatePoolAllocPoint, setUpdatePoolAllocPoint] = useState('');

  // Backend configuration state
  const [backendConfig, setBackendConfig] = useState<any>(null);
  const [newPollInterval, setNewPollInterval] = useState('');

  // Autoswap state
  const [autoswapStatus, setAutoswapStatus] = useState<any>(null);
  const [autoswapEvaluation, setAutoswapEvaluation] = useState<any>(null);
  const [isRefreshingAutoswap, setIsRefreshingAutoswap] = useState(false);
  const [autoswapEnabled, setAutoswapEnabled] = useState<boolean>(false);
  const [isTogglingAutoswap, setIsTogglingAutoswap] = useState(false);

  // Check if address is excluded from tax
  const { data: isExcluded, refetch: refetchExcluded } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'isExcludedFromTax',
    args: checkExcludeAddress && checkExcludeAddress.startsWith('0x') ? [checkExcludeAddress as `0x${string}`] : undefined,
  });

  // Tax timelock data
  const { data: hasPendingTaxChange, refetch: refetchPendingTax } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'hasPendingTaxChange',
  });

  const { data: pendingBuyTaxBps } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'pendingBuyTaxBps',
  });

  const { data: pendingSellTaxBps } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'pendingSellTaxBps',
  });

  const { data: taxChangeTimestamp } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'taxChangeTimestamp',
  });

  const { data: taxChangeDelay } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'TAX_CHANGE_DELAY',
  });

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
    if (rewardPerBlock !== undefined) {
      setNewEmissionRate(formatUnits(rewardPerBlock as bigint, 18));
    }
  }, [buyTaxBps, sellTaxBps, swapThreshold, charityWallet, rewardPerBlock]);

  const { writeContractAsync } = useWriteContract();
  const [pendingTx, setPendingTx] = useState<string | null>(null);

  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: pendingTx as `0x${string}` | undefined,
  });

  // Check if user is owner
  // In development mode (using placeholder addresses), allow access for preview
  const isDevelopmentMode = ADDRESSES.PANBOO_TOKEN === '0x0000000000000000000000000000000000000000';
  const isOwner = isConnected && address && (
    (contractOwner && address.toLowerCase() === (contractOwner as string).toLowerCase()) ||
    isDevelopmentMode
  );

  // Fetch backend configuration and autoswap status
  useEffect(() => {
    const fetchBackendConfig = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
        const response = await fetch(`${apiUrl}/config`);
        if (response.ok) {
          const data = await response.json();
          setBackendConfig(data);
          setNewPollInterval((data.pollInterval / 3600000).toString()); // Convert to hours
        }
      } catch (error) {
        console.error('Error fetching backend config:', error);
      }
    };

    const fetchAutoswapStatus = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
        const [statusRes, evalRes, enabledRes] = await Promise.all([
          fetch(`${apiUrl}/autoswap/status`),
          fetch(`${apiUrl}/autoswap/evaluate`),
          fetch(`${apiUrl}/autoswap/enabled`),
        ]);

        if (statusRes.ok) {
          const status = await statusRes.json();
          setAutoswapStatus(status);
        }

        if (evalRes.ok) {
          const evaluation = await evalRes.json();
          setAutoswapEvaluation(evaluation);
        }

        if (enabledRes.ok) {
          const { enabled } = await enabledRes.json();
          setAutoswapEnabled(enabled);
        }
      } catch (error) {
        console.error('Error fetching autoswap status:', error);
      }
    };

    if (isConnected && isOwner) {
      fetchBackendConfig();
      fetchAutoswapStatus();
    }
  }, [isConnected, isOwner, contractOwner, address]);

  // Schedule tax rate change (24hr timelock)
  const handleScheduleTaxChange = async () => {
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

      toast.info('Scheduling tax change (24hr timelock)...');

      const hash = await writeContractAsync({
        address: ADDRESSES.PANBOO_TOKEN,
        abi: PANBOO_TOKEN_ABI,
        functionName: 'scheduleTaxRateChange',
        args: [BigInt(buyBps), BigInt(sellBps)],
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(resolve => setTimeout(resolve, 3000));
      refetchPendingTax();
      toast.success(`Tax change scheduled! Executes in 24 hours.`);
    } catch (error: any) {
      console.error('Error scheduling tax change:', error);
      toast.error(error?.message || 'Failed to schedule tax change');
    }
  };

  // Execute pending tax change
  const handleExecuteTaxChange = async () => {
    if (!ensureReady()) return;

    try {
      toast.info('Executing tax change...');

      const hash = await writeContractAsync({
        address: ADDRESSES.PANBOO_TOKEN,
        abi: PANBOO_TOKEN_ABI,
        functionName: 'executeTaxRateChange',
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(resolve => setTimeout(resolve, 3000));
      refetchBuyTax();
      refetchSellTax();
      refetchPendingTax();
      toast.success('Tax rates updated!');
    } catch (error: any) {
      console.error('Error executing tax change:', error);
      toast.error(error?.message || 'Failed to execute tax change');
    }
  };

  // Cancel pending tax change
  const handleCancelTaxChange = async () => {
    if (!ensureReady()) return;

    try {
      toast.info('Cancelling tax change...');

      const hash = await writeContractAsync({
        address: ADDRESSES.PANBOO_TOKEN,
        abi: PANBOO_TOKEN_ABI,
        functionName: 'cancelTaxRateChange',
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(resolve => setTimeout(resolve, 3000));
      refetchPendingTax();
      toast.success('Tax change cancelled!');
    } catch (error: any) {
      console.error('Error cancelling tax change:', error);
      toast.error(error?.message || 'Failed to cancel tax change');
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

  // Toggle trading enabled (circuit breaker)
  const handleToggleTrading = async () => {
    if (!ensureReady()) return;

    try {
      const newState = !tradingEnabled;
      toast.info(`${newState ? 'Enabling' : 'Disabling'} trading...`);

      const hash = await writeContractAsync({
        address: ADDRESSES.PANBOO_TOKEN,
        abi: PANBOO_TOKEN_ABI,
        functionName: 'setTradingEnabled',
        args: [newState],
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(resolve => setTimeout(resolve, 3000));
      refetchTradingEnabled();
      toast.success(`Trading ${newState ? 'enabled' : 'disabled'}!`);
    } catch (error: any) {
      console.error('Error toggling trading:', error);
      toast.error(error?.message || 'Failed to toggle trading');
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

  // Update emission rate
  const handleUpdateEmissionRate = async () => {
    if (!ensureReady()) return;

    try {
      const emissionRateBN = parseUnits(newEmissionRate, 18);

      if (Number(newEmissionRate) < 0) {
        toast.error('Emission rate cannot be negative');
        return;
      }

      toast.info('Updating emission rate...');

      const hash = await writeContractAsync({
        address: ADDRESSES.MASTERCHEF,
        abi: MASTERCHEF_ABI,
        functionName: 'updateEmissionRate',
        args: [emissionRateBN],
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(resolve => setTimeout(resolve, 3000));
      refetchRewardPerBlock();
      toast.success(`Emission rate updated to ${newEmissionRate} PNB/block`);
    } catch (error: any) {
      console.error('Error updating emission rate:', error);
      toast.error(error?.message || 'Failed to update emission rate');
    }
  };

  // Toggle tax exclusion
  const handleToggleTaxExclusion = async (addressToToggle: string, exclude: boolean) => {
    if (!ensureReady()) return;

    try {
      if (!addressToToggle || !addressToToggle.startsWith('0x')) {
        toast.error('Invalid wallet address');
        return;
      }

      toast.info(`${exclude ? 'Excluding' : 'Including'} address from tax...`);

      const hash = await writeContractAsync({
        address: ADDRESSES.PANBOO_TOKEN,
        abi: PANBOO_TOKEN_ABI,
        functionName: 'setExcludedFromTax',
        args: [addressToToggle as `0x${string}`, exclude],
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(resolve => setTimeout(resolve, 3000));
      refetchExcluded();
      toast.success(`Address ${exclude ? 'excluded from' : 'included in'} tax!`);
    } catch (error: any) {
      console.error('Error toggling tax exclusion:', error);
      toast.error(error?.message || 'Failed to update tax exclusion');
    }
  };

  // Check if address is excluded
  const handleCheckExclusion = () => {
    if (!checkExcludeAddress || !checkExcludeAddress.startsWith('0x')) {
      toast.error('Please enter a valid address');
      return;
    }
    refetchExcluded();
  };

  // Add new pool
  const handleAddPool = async () => {
    if (!ensureReady()) return;

    try {
      if (!newPoolLpToken || !newPoolLpToken.startsWith('0x')) {
        toast.error('Invalid LP token address');
        return;
      }

      const allocPoint = parseInt(newPoolAllocPoint);
      if (isNaN(allocPoint) || allocPoint <= 0) {
        toast.error('Allocation points must be positive');
        return;
      }

      toast.info('Adding new pool...');

      const hash = await writeContractAsync({
        address: ADDRESSES.MASTERCHEF,
        abi: MASTERCHEF_ABI,
        functionName: 'add',
        args: [BigInt(allocPoint), newPoolLpToken as `0x${string}`, true],
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(resolve => setTimeout(resolve, 3000));
      refetchTotalAllocPoint();
      toast.success(`Pool added with ${allocPoint} allocation points!`);
      setNewPoolLpToken('');
      setNewPoolAllocPoint('');
    } catch (error: any) {
      console.error('Error adding pool:', error);
      toast.error(error?.message || 'Failed to add pool');
    }
  };

  // Update pool allocation
  const handleUpdatePool = async () => {
    if (!ensureReady()) return;

    try {
      const pid = parseInt(updatePoolId);
      const allocPoint = parseInt(updatePoolAllocPoint);

      if (isNaN(pid) || pid < 0) {
        toast.error('Invalid pool ID');
        return;
      }

      if (isNaN(allocPoint) || allocPoint < 0) {
        toast.error('Allocation points must be non-negative');
        return;
      }

      toast.info('Updating pool allocation...');

      const hash = await writeContractAsync({
        address: ADDRESSES.MASTERCHEF,
        abi: MASTERCHEF_ABI,
        functionName: 'set',
        args: [BigInt(pid), BigInt(allocPoint), true],
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(resolve => setTimeout(resolve, 3000));
      refetchTotalAllocPoint();
      toast.success(`Pool ${pid} updated to ${allocPoint} points!`);
      setUpdatePoolId('');
      setUpdatePoolAllocPoint('');
    } catch (error: any) {
      console.error('Error updating pool:', error);
      toast.error(error?.message || 'Failed to update pool');
    }
  };

  // Refresh autoswap status
  const handleRefreshAutoswap = async () => {
    setIsRefreshingAutoswap(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
      const [statusRes, evalRes, enabledRes] = await Promise.all([
        fetch(`${apiUrl}/autoswap/status`),
        fetch(`${apiUrl}/autoswap/evaluate`),
        fetch(`${apiUrl}/autoswap/enabled`),
      ]);

      if (statusRes.ok) {
        const status = await statusRes.json();
        setAutoswapStatus(status);
      }

      if (evalRes.ok) {
        const evaluation = await evalRes.json();
        setAutoswapEvaluation(evaluation);
      }

      if (enabledRes.ok) {
        const { enabled } = await enabledRes.json();
        setAutoswapEnabled(enabled);
      }

      toast.success('Autoswap status refreshed');
    } catch (error) {
      console.error('Error refreshing autoswap:', error);
      toast.error('Failed to refresh autoswap status');
    } finally {
      setIsRefreshingAutoswap(false);
    }
  };

  // Toggle autoswap enabled/disabled
  const handleToggleAutoswap = async () => {
    setIsTogglingAutoswap(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/autoswap/enabled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !autoswapEnabled }),
      });

      if (!response.ok) throw new Error('Failed to toggle autoswap');

      const data = await response.json();
      setAutoswapEnabled(data.enabled);
      await handleRefreshAutoswap();
      toast.success(data.message);
    } catch (error: any) {
      console.error('Error toggling autoswap:', error);
      toast.error('Failed to toggle autoswap');
    } finally {
      setIsTogglingAutoswap(false);
    }
  };

  // Manual trigger swap for charity (via backend API)
  const handleManualSwapAPI = async () => {
    if (!ensureReady()) return;

    try {
      // Check evaluation first
      if (autoswapEvaluation && !autoswapEvaluation.shouldSwap) {
        toast.error(
          `Not recommended to swap now: ${autoswapEvaluation.reason}`,
          { duration: 5000 }
        );
        return;
      }

      toast.info('Triggering charity swap...');

      const hash = await writeContractAsync({
        address: ADDRESSES.PANBOO_TOKEN,
        abi: PANBOO_TOKEN_ABI,
        functionName: 'swapForCharity',
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(resolve => setTimeout(resolve, 3000));
      await handleRefreshAutoswap(); // Refresh status after swap
      toast.success('Charity swap executed successfully!');
    } catch (error: any) {
      console.error('Error executing swap:', error);
      toast.error(error?.message || 'Failed to execute swap');
    }
  };

  // Not connected
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="gradient-card">
          <CardContent className="pt-6 text-center py-12">
            <Shield className="w-16 h-16 mx-auto text-[#00C48C] mb-4" />
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
        <Card className="gradient-card border-red-500/20">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                Only the contract owner can access this panel
              </p>
              <div className="bg-[#00C48C]/5 border border-[#00C48C]/20 p-4 rounded-md inline-block">
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

      {/* Development Mode Banner */}
      {isDevelopmentMode && (
        <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-purple-400 font-medium">
                🔧 Development Mode - Preview Only
              </p>
              <p className="text-xs text-purple-300 mt-1">
                Contracts not deployed yet. Deploy contracts and update .env to enable actual admin functions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning Banner */}
      {!isDevelopmentMode && (
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Rates */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00C48C]" />
              Tax Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Pending Tax Change Warning */}
              {Boolean(hasPendingTaxChange) && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                  <p className="text-sm font-medium text-yellow-400 mb-2">⏳ Pending Tax Change</p>
                  <div className="text-xs text-yellow-300 space-y-1">
                    <p>• Buy Tax: {pendingBuyTaxBps ? (Number(pendingBuyTaxBps) / 100).toFixed(1) : '--'}%</p>
                    <p>• Sell Tax: {pendingSellTaxBps ? (Number(pendingSellTaxBps) / 100).toFixed(1) : '--'}%</p>
                    <p>• Execute After: {taxChangeTimestamp ? new Date(Number(taxChangeTimestamp) * 1000).toLocaleString() : '--'}</p>
                    <p>• Time Remaining: {taxChangeTimestamp ? Math.max(0, Math.floor((Number(taxChangeTimestamp) - Date.now() / 1000) / 3600)) : '--'} hours</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={handleExecuteTaxChange}
                      disabled={isTxLoading || Boolean(taxChangeTimestamp && Date.now() / 1000 < Number(taxChangeTimestamp))}
                      size="sm"
                      className="flex-1"
                    >
                      {isTxLoading ? 'Executing...' : 'Execute Now'}
                    </Button>
                    <Button
                      onClick={handleCancelTaxChange}
                      disabled={isTxLoading}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      {isTxLoading ? 'Cancelling...' : 'Cancel'}
                    </Button>
                  </div>
                </div>
              )}

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
                onClick={handleScheduleTaxChange}
                disabled={isTxLoading || Boolean(hasPendingTaxChange)}
                className="w-full"
              >
                {isTxLoading ? 'Scheduling...' : Boolean(hasPendingTaxChange) ? 'Tax Change Pending' : 'Schedule Tax Change (24hr)'}
              </Button>

              <div className="text-xs text-muted-foreground p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <p className="font-medium text-blue-400 mb-1">🔒 24-Hour Timelock</p>
                <p className="text-blue-300">Tax changes require 24 hours before execution. This protects users from sudden tax increases.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charity Wallet */}
        <Card className="gradient-card-accent border-glow">
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
        <Card className="gradient-card">
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

        {/* Farming Rewards */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00C48C]" />
              Farming Rewards (MasterChef)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">Current Emission</p>
                  <p className="text-lg font-bold">
                    {rewardPerBlock ? formatUnits(rewardPerBlock as bigint, 18) : '--'} PNB/block
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{rewardPerBlock ? (Number(formatUnits(rewardPerBlock as bigint, 18)) * 28800).toLocaleString() : '--'} PNB/day
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">Active Pools</p>
                  <p className="text-lg font-bold">
                    {poolLength !== undefined && poolLength !== null ? poolLength.toString() : '--'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Farm pools
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  New Emission Rate (PNB per block)
                </label>
                <Input
                  type="number"
                  value={newEmissionRate}
                  onChange={(e) => setNewEmissionRate(e.target.value)}
                  placeholder="10"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  BSC: ~3 sec/block, 28,800 blocks/day
                </p>
              </div>

              <Button
                onClick={handleUpdateEmissionRate}
                disabled={isTxLoading}
                className="w-full"
              >
                {isTxLoading ? 'Updating...' : 'Update Emission Rate'}
              </Button>

              <div className="text-xs text-muted-foreground p-3 bg-purple-500/10 border border-purple-500/20 rounded-md">
                <p className="font-medium text-purple-400 mb-1">📊 How it works</p>
                <p className="text-purple-300">
                  • Rewards are calculated per block automatically by smart contract<br />
                  • Your share = (Your staked LP / Total staked LP) × emission rate<br />
                  • More stakers = rewards split more ways = lower APR<br />
                  • Tokens only sent when users claim (harvest)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pool Management */}
        <Card className="lg:col-span-2 gradient-card-accent border-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#00C48C]" />
              Pool Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Current Pools Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">Total Pools</p>
                  <p className="text-lg font-bold">
                    {poolLength !== undefined && poolLength !== null ? poolLength.toString() : '--'}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">Total Allocation</p>
                  <p className="text-lg font-bold">
                    {totalAllocPoint !== undefined && totalAllocPoint !== null ? totalAllocPoint.toString() : '--'}
                  </p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">Emission Rate</p>
                  <p className="text-lg font-bold">
                    {rewardPerBlock ? formatUnits(rewardPerBlock as bigint, 18) : '--'}
                  </p>
                  <p className="text-xs text-muted-foreground">PNB/block</p>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Add New Pool */}
              <div>
                <h3 className="text-sm font-medium mb-3">Add New Pool</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      LP Token Address
                    </label>
                    <Input
                      type="text"
                      value={newPoolLpToken}
                      onChange={(e) => setNewPoolLpToken(e.target.value)}
                      placeholder="0x... (LP pair or PNB token for single staking)"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use {ADDRESSES.PANBOO_TOKEN} for PNB single-stake pool
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Allocation Points
                    </label>
                    <Input
                      type="number"
                      value={newPoolAllocPoint}
                      onChange={(e) => setNewPoolAllocPoint(e.target.value)}
                      placeholder="1000"
                      min="1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Higher = more rewards. Example: 1000 points = {totalAllocPoint ? ((1000 / (Number(totalAllocPoint) + 1000)) * 100).toFixed(1) : '--'}% of emissions
                    </p>
                  </div>
                  <Button
                    onClick={handleAddPool}
                    disabled={isTxLoading || !newPoolLpToken || !newPoolAllocPoint}
                    className="w-full"
                  >
                    {isTxLoading ? 'Adding...' : 'Add Pool'}
                  </Button>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Update Pool Allocation */}
              <div>
                <h3 className="text-sm font-medium mb-3">Update Pool Weight</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Pool ID
                    </label>
                    <Input
                      type="number"
                      value={updatePoolId}
                      onChange={(e) => setUpdatePoolId(e.target.value)}
                      placeholder="0 (first pool), 1 (second pool), etc."
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Pool 0 = PNB/BNB LP (created during deployment)
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      New Allocation Points
                    </label>
                    <Input
                      type="number"
                      value={updatePoolAllocPoint}
                      onChange={(e) => setUpdatePoolAllocPoint(e.target.value)}
                      placeholder="500"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Set to 0 to effectively disable the pool
                    </p>
                  </div>
                  <Button
                    onClick={handleUpdatePool}
                    disabled={isTxLoading || updatePoolId === '' || updatePoolAllocPoint === ''}
                    className="w-full"
                    variant="outline"
                  >
                    {isTxLoading ? 'Updating...' : 'Update Pool'}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground p-3 bg-purple-500/10 border border-purple-500/20 rounded-md">
                <p className="font-medium text-purple-400 mb-1">💡 Pool Weight Examples</p>
                <div className="text-purple-300 space-y-1">
                  <p>• Pool 0: 2000 pts, Pool 1: 1000 pts → 66% / 33% split</p>
                  <p>• Pool 0: 1000 pts, Pool 1: 1000 pts → 50% / 50% split</p>
                  <p>• Single PNB staking: Use PNB token address as LP token</p>
                  <p>• LP pools earn more, single-stake pools earn less (lower risk)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Exclusion Management */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#00C48C]" />
              Tax Exclusion Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Check Address Exclusion */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Check if Address is Excluded
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={checkExcludeAddress}
                    onChange={(e) => setCheckExcludeAddress(e.target.value)}
                    placeholder="0x..."
                    className="font-mono text-sm flex-1"
                  />
                  <Button
                    onClick={handleCheckExclusion}
                    variant="outline"
                    size="sm"
                  >
                    Check
                  </Button>
                </div>
                {checkExcludeAddress && checkExcludeAddress.startsWith('0x') && isExcluded !== undefined && (
                  <div className={`mt-2 p-2 rounded-md text-sm ${isExcluded ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {isExcluded ? '✅ Excluded from tax' : '❌ Not excluded (pays tax)'}
                  </div>
                )}
              </div>

              <div className="border-t border-border my-4" />

              {/* Manage Tax Exclusion */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Exclude/Include Address from Tax
                </label>
                <Input
                  type="text"
                  value={excludeAddress}
                  onChange={(e) => setExcludeAddress(e.target.value)}
                  placeholder="0x... (MasterChef, P2E contracts, etc.)"
                  className="font-mono text-sm mb-2"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleToggleTaxExclusion(excludeAddress, true)}
                    disabled={isTxLoading || !excludeAddress}
                    className="flex-1"
                    variant="default"
                  >
                    {isTxLoading ? 'Processing...' : 'Exclude'}
                  </Button>
                  <Button
                    onClick={() => handleToggleTaxExclusion(excludeAddress, false)}
                    disabled={isTxLoading || !excludeAddress}
                    className="flex-1"
                    variant="outline"
                  >
                    {isTxLoading ? 'Processing...' : 'Include'}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <p className="font-medium text-blue-400 mb-1">ℹ️ Common Exclusions</p>
                <div className="text-blue-300 space-y-1">
                  <p>• <span className="font-mono text-xs">{ADDRESSES.PANBOO_TOKEN}</span> - Token Contract ✅</p>
                  <p>• <span className="font-mono text-xs">{formatAddress(charityWallet as string || '')}</span> - Charity Wallet ✅</p>
                  <p>• <span className="font-mono text-xs">{ADDRESSES.MASTERCHEF}</span> - MasterChef ✅</p>
                  <p>• Owner Wallet ✅</p>
                  <p className="mt-2 text-xs">You may want to exclude: P2E contracts, lock contracts, vesting wallets</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Actions */}
        <Card className="gradient-card">
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

              <div className="p-4 bg-muted rounded-md border-2 border-red-500/20">
                <p className="text-sm font-medium mb-1 text-red-400">🚨 Trading Circuit Breaker</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Emergency stop for all trading, taxes, and auto-swaps. Use only if something unusual happens.
                </p>
                <div className="mb-3 p-2 bg-background rounded-md">
                  <p className="text-xs text-muted-foreground">Current Status:</p>
                  <p className={`text-sm font-bold ${Boolean(tradingEnabled) ? 'text-green-400' : 'text-red-400'}`}>
                    {Boolean(tradingEnabled) ? '✅ Trading Enabled' : '🛑 Trading Disabled'}
                  </p>
                </div>
                <Button
                  onClick={handleToggleTrading}
                  disabled={isTxLoading}
                  className="w-full"
                  variant={Boolean(tradingEnabled) ? 'destructive' : 'default'}
                >
                  {isTxLoading ? 'Processing...' : Boolean(tradingEnabled) ? '🛑 Disable Trading' : '✅ Enable Trading'}
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

        {/* Backend Configuration */}
        <Card className="lg:col-span-2 gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-[#00C48C]" />
              Backend Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {backendConfig ? (
              <div className="space-y-4">
                {/* Configuration Display */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">Chain ID</p>
                    <p className="text-lg font-bold">{backendConfig.chainId}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {backendConfig.chainId === 97 ? 'BSC Testnet' : backendConfig.chainId === 56 ? 'BSC Mainnet' : 'Unknown'}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">API Port</p>
                    <p className="text-lg font-bold">{backendConfig.port}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">Log Level</p>
                    <p className="text-lg font-bold">{backendConfig.logLevel}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">RPC URL</p>
                    <p className="text-sm font-mono truncate" title={backendConfig.rpcUrl}>
                      {backendConfig.rpcUrl.split('//')[1]?.substring(0, 20)}...
                    </p>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Blockchain Listener Settings */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Blockchain Listener</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-[#00C48C]/5 border border-[#00C48C]/20 rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Poll Interval</p>
                      <p className="text-2xl font-bold text-[#00C48C]">{backendConfig.pollIntervalHours}h</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        = {backendConfig.pollIntervalMinutes} minutes
                      </p>
                      <p className="text-xs text-muted-foreground">
                        = {(backendConfig.pollInterval / 1000).toLocaleString()}s
                      </p>
                    </div>
                    <div className="col-span-1 md:col-span-2 p-4 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-2">Update Poll Interval</p>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            type="number"
                            value={newPollInterval}
                            onChange={(e) => setNewPollInterval(e.target.value)}
                            placeholder="1"
                            min="0.1"
                            step="0.5"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Hours between blockchain checks
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            const hours = parseFloat(newPollInterval);
                            if (isNaN(hours) || hours <= 0) {
                              toast.error('Please enter a valid number of hours');
                              return;
                            }
                            toast.info(
                              `To update:\n1. Edit backend/.env\n2. Set POLL_INTERVAL=${hours * 3600000}\n3. Restart backend`,
                              { duration: 8000 }
                            );
                          }}
                          variant="outline"
                        >
                          Instructions
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Autoswap Strategy */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#00C48C]" />
                    Price-Based Autoswap Strategy
                  </h3>

                  {autoswapStatus && autoswapEvaluation ? (
                    <div className="space-y-4">
                      {/* Strategy Status */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-4 border rounded-md ${autoswapEnabled ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                          <p className="text-xs text-muted-foreground mb-1">Service Status</p>
                          <p className="text-lg font-bold flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${autoswapEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
                            {autoswapEnabled ? 'Enabled' : 'Disabled'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {autoswapEnabled
                              ? `Running: ${autoswapStatus.isRunning ? 'Yes' : 'No'} • Check interval: ${(autoswapStatus.monitoringInterval / 60000).toFixed(1)} min`
                              : 'Autoswap is currently disabled'
                            }
                          </p>
                        </div>

                        <div className={`p-4 border rounded-md ${autoswapEvaluation.shouldSwap ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                          <p className="text-xs text-muted-foreground mb-1">Swap Recommendation</p>
                          <p className="text-lg font-bold">
                            {autoswapEvaluation.shouldSwap ? '✅ Execute Swap' : '⏳ Wait'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {autoswapEvaluation.reason}
                          </p>
                        </div>
                      </div>

                      {/* Price Data */}
                      {autoswapEvaluation.priceData && (
                        <div className="p-4 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-3">Price Analysis</p>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Current Price</p>
                              <p className="text-sm font-mono">{autoswapEvaluation.priceData.currentPrice}</p>
                              <p className="text-xs text-muted-foreground">BNB</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">MA-5</p>
                              <p className="text-sm font-mono">{autoswapEvaluation.priceData.ma5}</p>
                              <p className="text-xs text-muted-foreground">5-min avg</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">MA-15</p>
                              <p className="text-sm font-mono">{autoswapEvaluation.priceData.ma15}</p>
                              <p className="text-xs text-muted-foreground">15-min avg</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">10min Δ</p>
                              <p className={`text-sm font-mono ${parseFloat(autoswapEvaluation.priceData.priceChange10min) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {autoswapEvaluation.priceData.priceChange10min}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">30min Δ</p>
                              <p className={`text-sm font-mono ${parseFloat(autoswapEvaluation.priceData.priceChange30min) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {autoswapEvaluation.priceData.priceChange30min}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Signals */}
                      {autoswapEvaluation.signals && (
                        <div className="p-4 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-3">Market Signals</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(autoswapEvaluation.signals).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2">
                                <span className={`text-lg ${value ? '✅' : '❌'}`} />
                                <span className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Accumulated Tokens */}
                      <div className="p-4 bg-[#00C48C]/5 border border-[#00C48C]/20 rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">Accumulated Tokens</p>
                        <p className="text-2xl font-bold text-[#00C48C]">
                          {autoswapEvaluation.accumulatedTokens ? parseFloat(autoswapEvaluation.accumulatedTokens).toLocaleString() : '0'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Threshold: {autoswapEvaluation.threshold ? parseFloat(autoswapEvaluation.threshold).toLocaleString() : '1,000'} PANBOO
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button
                            onClick={handleToggleAutoswap}
                            disabled={isTogglingAutoswap}
                            variant={autoswapEnabled ? "destructive" : "default"}
                            className="flex-1"
                          >
                            {isTogglingAutoswap
                              ? 'Toggling...'
                              : autoswapEnabled
                              ? 'Disable Autoswap'
                              : 'Enable Autoswap'
                            }
                          </Button>
                          <Button
                            onClick={handleRefreshAutoswap}
                            disabled={isRefreshingAutoswap}
                            variant="outline"
                            className="flex-1"
                          >
                            {isRefreshingAutoswap ? 'Refreshing...' : 'Refresh Status'}
                          </Button>
                        </div>
                        <Button
                          onClick={handleManualSwapAPI}
                          disabled={isTxLoading || !autoswapEvaluation.shouldSwap || !autoswapEnabled}
                          className="w-full"
                        >
                          {isTxLoading ? 'Swapping...' : 'Execute Swap Now'}
                        </Button>
                      </div>

                      {/* Last Check Info */}
                      <div className="text-xs text-muted-foreground p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                        <p className="font-medium text-blue-400 mb-1">ℹ️ How Autoswap Works</p>
                        <div className="text-blue-300 space-y-1">
                          <p>• Backend monitors price every {(autoswapStatus.monitoringInterval / 60000).toFixed(0)} minute(s)</p>
                          <p>• Analyzes 5 market signals: uptrend, price above MA, recent gain, not dumping, momentum</p>
                          <p>• Requires at least 3/5 positive signals to recommend swap</p>
                          <p>• Strategy: Sell accumulated charity tokens when price is rising (maximize BNB received)</p>
                          <p>• Last check: {autoswapStatus.lastCheck ? new Date(autoswapStatus.lastCheck).toLocaleString() : 'Never'}</p>
                          <p>• Last swap: {autoswapStatus.lastSwap ? new Date(autoswapStatus.lastSwap).toLocaleString() : 'Never'}</p>
                          <p>• Total swaps: {autoswapStatus.totalSwapsExecuted || 0}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Loading autoswap status...</p>
                      <Button
                        onClick={handleRefreshAutoswap}
                        disabled={isRefreshingAutoswap}
                        variant="outline"
                        className="mt-4"
                      >
                        {isRefreshingAutoswap ? 'Loading...' : 'Load Status'}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border-t border-border" />

                {/* Contract Addresses */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Contract Addresses</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-muted rounded-md">
                      <span className="text-xs text-muted-foreground">PANBOO Token</span>
                      <code className="text-xs font-mono">{formatAddress(backendConfig.tokenAddress)}</code>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded-md">
                      <span className="text-xs text-muted-foreground">MasterChef</span>
                      <code className="text-xs font-mono">{formatAddress(backendConfig.masterChefAddress)}</code>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded-md">
                      <span className="text-xs text-muted-foreground">Charity Wallet</span>
                      <code className="text-xs font-mono">{formatAddress(backendConfig.charityWallet)}</code>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded-md">
                      <span className="text-xs text-muted-foreground">PANBOO/BNB Pair</span>
                      <code className="text-xs font-mono">{formatAddress(backendConfig.panbooBnbPair)}</code>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <p className="font-medium text-blue-400 mb-1">ℹ️ How the Listener Works</p>
                  <div className="text-blue-300 space-y-1">
                    <p>• Listener checks blockchain every {backendConfig.pollIntervalHours} hour(s) for new transactions</p>
                    <p>• It stores the last processed block and catches up on all missed blocks</p>
                    <p>• Longer intervals = less RPC calls = lower rate limits, but events appear with delay</p>
                    <p>• For testnet: 1 hour is recommended. For mainnet: 5-15 minutes is typical.</p>
                    <p className="mt-2">• Changes to backend/.env require restarting the backend to take effect</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Server className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Loading backend configuration...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
