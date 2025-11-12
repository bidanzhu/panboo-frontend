import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits } from 'ethers';
import { ADDRESSES } from '@/contracts/addresses';
import { MASTERCHEF_ABI, ERC20_ABI } from '@/contracts/abis';
import { useChainReady } from './useChainReady';
import { useBnbUsd } from './useBnbUsd';
import { calculateGasCostUSD } from '@/utils/calculations';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils';

export type FarmActionStep = 'idle' | 'approving' | 'approved' | 'staking' | 'unstaking' | 'harvesting' | 'success' | 'error';

export interface FarmActionState {
  step: FarmActionStep;
  txHash?: string;
  error?: string;
  estimatedGas?: bigint;
  estimatedCostUsd?: number;
}

export function useFarmActions() {
  const { address } = useAccount();
  const { ensureReady } = useChainReady();
  const { data: bnbPrice = 320 } = useBnbUsd();
  const [actionState, setActionState] = useState<FarmActionState>({ step: 'idle' });
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  /**
   * Check allowance for a specific LP token
   */
  const checkAllowance = useCallback(
    async (lpAddress: string): Promise<bigint> => {
      if (!address || !publicClient) return 0n;

      try {
        const allowance = await publicClient.readContract({
          address: lpAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, ADDRESSES.MASTERCHEF],
        });

        return (allowance as bigint) || 0n;
      } catch (error) {
        console.error('Error checking allowance:', error);
        return 0n;
      }
    },
    [address, publicClient]
  );

  /**
   * Approve LP tokens
   */
  const approve = useCallback(
    async (lpAddress: string, amount: bigint): Promise<boolean> => {
      if (!ensureReady() || !publicClient) return false;

      try {
        setActionState({ step: 'approving' });
        toast.info('Step 1 of 2: Approving LP tokens...');

        const hash = await writeContractAsync({
          address: lpAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [ADDRESSES.MASTERCHEF, amount],
        });

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
          setActionState({ step: 'approved', txHash: hash });
          toast.success('LP tokens approved successfully');
          return true;
        } else {
          throw new Error('Approval transaction failed');
        }
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        console.error('Approval error:', error);
        setActionState({ step: 'error', error: errorMessage });
        toast.error(`Approval failed: ${errorMessage}`);
        return false;
      }
    },
    [ensureReady, writeContractAsync, publicClient]
  );

  /**
   * Stake LP tokens (with auto-approve if needed)
   */
  const stake = useCallback(
    async (pid: number, lpAddress: string, amount: string, decimals: number = 18): Promise<boolean> => {
      if (!ensureReady()) return false;
      if (!address) return false;

      try {
        const amountBN = parseUnits(amount, decimals);

        // Check allowance
        const allowance = await checkAllowance(lpAddress);

        // If allowance is insufficient, approve first
        if (allowance < amountBN) {
          toast.info('Insufficient allowance. Requesting approval...');

          const approved = await approve(lpAddress, amountBN);

          if (!approved) {
            return false;
          }

          // Wait a bit for the approval to be confirmed
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Now stake
        setActionState({ step: 'staking' });
        toast.info(`${allowance < amountBN ? 'Step 2 of 2: ' : ''}Staking LP tokens...`);

        // Estimate gas
        const estimatedGas = 200000n; // Approximate gas limit for deposit
        const gasPrice = 5000000000n; // 5 Gwei (BSC average)
        const estimatedCostUsd = calculateGasCostUSD(estimatedGas, gasPrice, bnbPrice);

        setActionState({ step: 'staking', estimatedGas, estimatedCostUsd });

        // Execute stake
        const hash = await writeContractAsync({
          address: ADDRESSES.MASTERCHEF,
          abi: MASTERCHEF_ABI,
          functionName: 'deposit',
          args: [BigInt(pid), amountBN],
        });

        setActionState({ step: 'success', txHash: hash });
        toast.success('Staked successfully!');

        return true;
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        console.error('Stake error:', error);
        setActionState({ step: 'error', error: errorMessage });
        toast.error(`Staking failed: ${errorMessage}`);
        return false;
      }
    },
    [ensureReady, address, checkAllowance, approve, writeContractAsync, bnbPrice]
  );

  /**
   * Unstake LP tokens
   */
  const unstake = useCallback(
    async (pid: number, amount: string, decimals: number = 18): Promise<boolean> => {
      if (!ensureReady()) return false;

      try {
        setActionState({ step: 'unstaking' });
        toast.info('Unstaking LP tokens...');

        const amountBN = parseUnits(amount, decimals);

        // Estimate gas
        const estimatedGas = 200000n;
        const gasPrice = 5000000000n; // 5 Gwei
        const estimatedCostUsd = calculateGasCostUSD(estimatedGas, gasPrice, bnbPrice);

        setActionState({ step: 'unstaking', estimatedGas, estimatedCostUsd });

        const hash = await writeContractAsync({
          address: ADDRESSES.MASTERCHEF,
          abi: MASTERCHEF_ABI,
          functionName: 'withdraw',
          args: [BigInt(pid), amountBN],
        });

        setActionState({ step: 'success', txHash: hash });
        toast.success('Unstaked successfully!');

        return true;
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        console.error('Unstake error:', error);
        setActionState({ step: 'error', error: errorMessage });
        toast.error(`Unstaking failed: ${errorMessage}`);
        return false;
      }
    },
    [ensureReady, writeContractAsync, bnbPrice]
  );

  /**
   * Harvest rewards (deposit 0 to claim pending rewards)
   */
  const harvest = useCallback(
    async (pid: number): Promise<boolean> => {
      if (!ensureReady()) return false;

      try {
        setActionState({ step: 'harvesting' });
        toast.info('Harvesting rewards...');

        // Estimate gas
        const estimatedGas = 150000n;
        const gasPrice = 5000000000n;
        const estimatedCostUsd = calculateGasCostUSD(estimatedGas, gasPrice, bnbPrice);

        setActionState({ step: 'harvesting', estimatedGas, estimatedCostUsd });

        const hash = await writeContractAsync({
          address: ADDRESSES.MASTERCHEF,
          abi: MASTERCHEF_ABI,
          functionName: 'deposit',
          args: [BigInt(pid), 0n], // Deposit 0 to harvest
        });

        setActionState({ step: 'success', txHash: hash });
        toast.success('Rewards harvested successfully!');

        return true;
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        console.error('Harvest error:', error);
        setActionState({ step: 'error', error: errorMessage });
        toast.error(`Harvest failed: ${errorMessage}`);
        return false;
      }
    },
    [ensureReady, writeContractAsync, bnbPrice]
  );

  /**
   * Harvest all rewards from multiple pools
   */
  const harvestAll = useCallback(
    async (pids: number[]): Promise<boolean> => {
      if (!ensureReady()) return false;
      if (pids.length === 0) return false;

      toast.info(`Harvesting rewards from ${pids.length} pools...`);

      let successCount = 0;

      for (const pid of pids) {
        const success = await harvest(pid);
        if (success) {
          successCount++;
        }
        // Wait a bit between transactions
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (successCount === pids.length) {
        toast.success(`Harvested all rewards from ${successCount} pools!`);
        return true;
      } else if (successCount > 0) {
        toast.warning(`Harvested ${successCount} of ${pids.length} pools`);
        return false;
      } else {
        toast.error('Failed to harvest rewards');
        return false;
      }
    },
    [ensureReady, harvest]
  );

  /**
   * Emergency withdraw (forfeit rewards)
   */
  const emergencyWithdraw = useCallback(
    async (pid: number): Promise<boolean> => {
      if (!ensureReady()) return false;

      try {
        const confirmed = window.confirm(
          'Emergency withdraw will forfeit all pending rewards. Are you sure?'
        );

        if (!confirmed) return false;

        setActionState({ step: 'unstaking' });
        toast.warning('Emergency withdrawing...');

        const hash = await writeContractAsync({
          address: ADDRESSES.MASTERCHEF,
          abi: MASTERCHEF_ABI,
          functionName: 'emergencyWithdraw',
          args: [BigInt(pid)],
        });

        setActionState({ step: 'success', txHash: hash });
        toast.success('Emergency withdrawal successful');

        return true;
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        console.error('Emergency withdraw error:', error);
        setActionState({ step: 'error', error: errorMessage });
        toast.error(`Emergency withdrawal failed: ${errorMessage}`);
        return false;
      }
    },
    [ensureReady, writeContractAsync]
  );

  /**
   * Reset action state
   */
  const reset = useCallback(() => {
    setActionState({ step: 'idle' });
  }, []);

  return {
    stake,
    unstake,
    harvest,
    harvestAll,
    emergencyWithdraw,
    checkAllowance,
    approve,
    actionState,
    reset,
  };
}
