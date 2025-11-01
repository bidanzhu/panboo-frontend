import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useCallback } from 'react';
import { ENV } from '@/contracts/addresses';
import { bsc, bscTestnet } from '@/config/chains';
import { toast } from 'sonner';

const TARGET_CHAIN_ID = ENV.CHAIN_ID;

export function useChainReady() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isWrongChain = isConnected && chainId !== TARGET_CHAIN_ID;
  const isReady = isConnected && chainId === TARGET_CHAIN_ID;

  const switchToBSC = useCallback(() => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (chainId === TARGET_CHAIN_ID) {
      return; // Already on correct chain
    }

    try {
      switchChain(
        { chainId: TARGET_CHAIN_ID },
        {
          onError: (error) => {
            console.error('Failed to switch chain:', error);

            // If the chain hasn't been added to the wallet, prompt to add it
            if (error.message.includes('Unrecognized chain')) {
              toast.error('Please add BSC network to your wallet');
              addBSCChain();
            } else {
              toast.error('Failed to switch to BSC network');
            }
          },
          onSuccess: () => {
            toast.success('Switched to BSC network');
          },
        }
      );
    } catch (error) {
      console.error('Switch chain error:', error);
      toast.error('Failed to switch network');
    }
  }, [isConnected, chainId, switchChain]);

  const addBSCChain = useCallback(async () => {
    const chain = TARGET_CHAIN_ID === 97 ? bscTestnet : bsc;

    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${chain.id.toString(16)}`,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: chain.rpcUrls.default.http,
              blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : [],
            },
          ],
        });
        toast.success('BSC network added successfully');
      }
    } catch (error) {
      console.error('Failed to add chain:', error);
      toast.error('Failed to add BSC network to wallet');
    }
  }, []);

  const ensureReady = useCallback((): boolean => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return false;
    }

    if (isWrongChain) {
      toast.error('Please switch to BSC network');
      switchToBSC();
      return false;
    }

    return true;
  }, [isConnected, isWrongChain, switchToBSC]);

  return {
    isReady,
    isWrongChain,
    isConnected,
    chainId,
    targetChainId: TARGET_CHAIN_ID,
    isSwitching,
    switchToBSC,
    addBSCChain,
    ensureReady,
  };
}

// Global window type extension for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}
