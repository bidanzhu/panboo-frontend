import { useReadContracts } from 'wagmi';
import { useMemo } from 'react';
import { ADDRESSES } from '@/contracts/addresses';
import { MASTERCHEF_ABI, PAIR_ABI, ERC20_ABI } from '@/contracts/abis';
import { calculateTVL, calculateLPPrice } from '@/utils/calculations';
import { usePanbooPrice } from './usePanbooPrice';
import { useBnbUsd } from './useBnbUsd';
import type { Pool } from '@/types';

/**
 * Calculate TVL for farms
 */
export function useTVL(pools: Pool[] = []) {
  const { panbooPriceUsd, isLoading: isPriceLoading } = usePanbooPrice();
  const { data: bnbPrice = 320 } = useBnbUsd();

  // Get pool info and LP data for all pools
  const { data: poolsData, isLoading: isPoolsLoading } = useReadContracts({
    contracts: pools.flatMap((pool) => [
      // Pool info from MasterChef
      {
        address: ADDRESSES.MASTERCHEF as `0x${string}`,
        abi: MASTERCHEF_ABI as any,
        functionName: 'poolInfo' as const,
        args: [BigInt(pool.pid)],
      },
      // LP token decimals
      {
        address: pool.lpAddress as `0x${string}`,
        abi: ERC20_ABI as any,
        functionName: 'decimals' as const,
      },
      // LP total supply
      {
        address: pool.lpAddress as `0x${string}`,
        abi: PAIR_ABI as any,
        functionName: 'totalSupply' as const,
      },
      // LP reserves
      {
        address: pool.lpAddress as `0x${string}`,
        abi: PAIR_ABI as any,
        functionName: 'getReserves' as const,
      },
      // Token0
      {
        address: pool.lpAddress as `0x${string}`,
        abi: PAIR_ABI as any,
        functionName: 'token0' as const,
      },
      // Token1
      {
        address: pool.lpAddress as `0x${string}`,
        abi: PAIR_ABI as any,
        functionName: 'token1' as const,
      },
      // LP balance in MasterChef (total staked)
      {
        address: pool.lpAddress as `0x${string}`,
        abi: ERC20_ABI as any,
        functionName: 'balanceOf' as const,
        args: [ADDRESSES.MASTERCHEF],
      },
    ]),
    query: {
      enabled: pools.length > 0 && ADDRESSES.MASTERCHEF !== '0x0000000000000000000000000000000000000000',
    },
  });

  const tvlData = useMemo(() => {
    if (!poolsData || isPriceLoading || isPoolsLoading) {
      return {
        totalTvlUsd: 0,
        poolTvls: [],
        isLoading: true,
      };
    }

    let totalTvl = 0;
    const poolTvls: Array<{ pid: number; tvlUsd: number; lpPrice: number }> = [];

    pools.forEach((pool, index) => {
      const baseIndex = index * 7; // 7 contracts per pool

      try {
        const decimals = (poolsData[baseIndex + 1].result as number) || 18;
        const totalSupply = (poolsData[baseIndex + 2].result as bigint) || 0n;
        const reserves = poolsData[baseIndex + 3].result as [bigint, bigint, number];
        const token0 = poolsData[baseIndex + 4].result as string;
        const token1 = poolsData[baseIndex + 5].result as string;
        const totalStaked = (poolsData[baseIndex + 6].result as bigint) || 0n;

        if (!reserves || totalSupply === 0n) {
          poolTvls.push({ pid: pool.pid, tvlUsd: 0, lpPrice: 0 });
          return;
        }

        const [reserve0, reserve1] = reserves;

        // Determine which token is PANBOO
        const isPanbooToken0 = token0.toLowerCase() === ADDRESSES.PANBOO_TOKEN.toLowerCase();
        const isPanbooToken1 = token1.toLowerCase() === ADDRESSES.PANBOO_TOKEN.toLowerCase();

        let lpPrice = 0;

        if (isPanbooToken0 || isPanbooToken1) {
          // PANBOO/BNB pair
          lpPrice = calculateLPPrice(
            reserve0,
            reserve1,
            totalSupply,
            isPanbooToken0 ? panbooPriceUsd : bnbPrice,
            isPanbooToken1 ? panbooPriceUsd : bnbPrice,
            18, // token0 decimals
            18, // token1 decimals
            decimals
          );
        } else {
          // Other pairs - assume both tokens have same price as BNB for now
          // In production, you'd fetch prices for both tokens
          lpPrice = calculateLPPrice(
            reserve0,
            reserve1,
            totalSupply,
            bnbPrice,
            bnbPrice,
            18,
            18,
            decimals
          );
        }

        const tvl = calculateTVL(totalStaked, lpPrice, decimals);

        poolTvls.push({
          pid: pool.pid,
          tvlUsd: tvl,
          lpPrice,
        });

        totalTvl += tvl;
      } catch (error) {
        console.error(`Error calculating TVL for pool ${pool.pid}:`, error);
        poolTvls.push({ pid: pool.pid, tvlUsd: 0, lpPrice: 0 });
      }
    });

    return {
      totalTvlUsd: totalTvl,
      poolTvls,
      isLoading: false,
    };
  }, [poolsData, pools, panbooPriceUsd, bnbPrice, isPriceLoading, isPoolsLoading]);

  return tvlData;
}
