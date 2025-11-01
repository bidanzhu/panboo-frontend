import { useReadContract, useReadContracts } from 'wagmi';
import { ADDRESSES } from '@/contracts/addresses';
import { PAIR_ABI } from '@/contracts/abis';
import { calculatePriceFromReserves } from '@/utils/calculations';
import { useBnbUsd } from './useBnbUsd';

/**
 * Get PANBOO price from PANBOO/BNB pair
 */
export function usePanbooPrice() {
  const { data: bnbPrice = 0, isLoading: isBnbLoading } = useBnbUsd();

  // Read pair reserves
  const { data: reserves, isLoading: isReservesLoading } = useReadContract({
    address: ADDRESSES.PANBOO_BNB_PAIR,
    abi: PAIR_ABI,
    functionName: 'getReserves',
    query: {
      refetchInterval: 15000, // Refresh every 15 seconds
      enabled: ADDRESSES.PANBOO_BNB_PAIR !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Read token0 and token1 to know which is which
  const { data: contractData } = useReadContracts({
    contracts: [
      {
        address: ADDRESSES.PANBOO_BNB_PAIR,
        abi: PAIR_ABI,
        functionName: 'token0',
      },
      {
        address: ADDRESSES.PANBOO_BNB_PAIR,
        abi: PAIR_ABI,
        functionName: 'token1',
      },
    ],
    query: {
      enabled: ADDRESSES.PANBOO_BNB_PAIR !== '0x0000000000000000000000000000000000000000',
    },
  });

  const isLoading = isReservesLoading || isBnbLoading;

  if (!reserves || !contractData || isLoading) {
    return {
      panbooPerBnb: 0,
      panbooPriceUsd: 0,
      bnbPerPanboo: 0,
      isLoading,
      error: null,
    };
  }

  try {
    const [reserve0, reserve1] = reserves as [bigint, bigint, number];
    const token0 = contractData[0].result as string;

    // Determine which token is PANBOO and which is BNB
    const isPanbooToken0 =
      token0.toLowerCase() === ADDRESSES.PANBOO_TOKEN.toLowerCase();

    let panbooPriceInBnb: number;

    if (isPanbooToken0) {
      // PANBOO is token0, so price = reserve1 / reserve0
      panbooPriceInBnb = calculatePriceFromReserves(
        reserve0,
        reserve1,
        18, // PANBOO decimals
        18, // BNB decimals
        true // Get price of token0 (PANBOO)
      );
    } else {
      // PANBOO is token1, so price = reserve0 / reserve1
      panbooPriceInBnb = calculatePriceFromReserves(
        reserve0,
        reserve1,
        18, // BNB decimals
        18, // PANBOO decimals
        false // Get price of token1 (PANBOO)
      );
    }

    const panbooPriceUsd = panbooPriceInBnb * bnbPrice;

    return {
      panbooPerBnb: panbooPriceInBnb,
      panbooPriceUsd,
      bnbPerPanboo: panbooPriceInBnb > 0 ? 1 / panbooPriceInBnb : 0,
      isLoading: false,
      error: null,
    };
  } catch (error) {
    console.error('Error calculating PANBOO price:', error);
    return {
      panbooPerBnb: 0,
      panbooPriceUsd: 0,
      bnbPerPanboo: 0,
      isLoading: false,
      error: error as Error,
    };
  }
}
