import { formatUnits } from 'ethers';

/**
 * Calculate APR for a farm
 * @param rewardPerBlock - Reward tokens per block (in wei)
 * @param blocksPerYear - Number of blocks per year (BSC: ~10,512,000)
 * @param tvl - Total value locked in USD
 * @param rewardTokenPrice - Price of reward token in USD
 * @param rewardDecimals - Decimals of reward token
 * @returns APR as a percentage
 */
export function calculateAPR(
  rewardPerBlock: bigint,
  blocksPerYear: number,
  tvl: number,
  rewardTokenPrice: number,
  rewardDecimals: number = 18
): number {
  if (tvl === 0 || rewardTokenPrice === 0) return 0;

  try {
    // Convert reward per block to a number
    const rewardPerBlockNum = parseFloat(formatUnits(rewardPerBlock, rewardDecimals));

    // Annual rewards in tokens
    const annualRewards = rewardPerBlockNum * blocksPerYear;

    // Annual rewards in USD
    const annualRewardsUSD = annualRewards * rewardTokenPrice;

    // APR = (Annual Rewards USD / TVL) * 100
    const apr = (annualRewardsUSD / tvl) * 100;

    return apr;
  } catch (error) {
    console.error('calculateAPR error:', error);
    return 0;
  }
}

/**
 * Calculate TVL for a pool
 * @param totalStaked - Total LP tokens staked (in wei)
 * @param lpPrice - Price of one LP token in USD
 * @param lpDecimals - Decimals of LP token
 * @returns TVL in USD
 */
export function calculateTVL(
  totalStaked: bigint,
  lpPrice: number,
  lpDecimals: number = 18
): number {
  if (lpPrice === 0) return 0;

  try {
    const stakedNum = parseFloat(formatUnits(totalStaked, lpDecimals));
    return stakedNum * lpPrice;
  } catch (error) {
    console.error('calculateTVL error:', error);
    return 0;
  }
}

/**
 * Calculate LP token price
 * @param reserve0 - Reserve of token0 in the pair
 * @param reserve1 - Reserve of token1 in the pair
 * @param totalSupply - Total supply of LP tokens
 * @param token0Price - Price of token0 in USD
 * @param token1Price - Price of token1 in USD
 * @param token0Decimals - Decimals of token0
 * @param token1Decimals - Decimals of token1
 * @param lpDecimals - Decimals of LP token
 * @returns LP token price in USD
 */
export function calculateLPPrice(
  reserve0: bigint,
  reserve1: bigint,
  totalSupply: bigint,
  token0Price: number,
  token1Price: number,
  token0Decimals: number = 18,
  token1Decimals: number = 18,
  lpDecimals: number = 18
): number {
  if (totalSupply === 0n) return 0;

  try {
    // Convert reserves to numbers
    const reserve0Num = parseFloat(formatUnits(reserve0, token0Decimals));
    const reserve1Num = parseFloat(formatUnits(reserve1, token1Decimals));

    // Calculate total value of reserves
    const totalValue = (reserve0Num * token0Price) + (reserve1Num * token1Price);

    // Convert total supply to number
    const totalSupplyNum = parseFloat(formatUnits(totalSupply, lpDecimals));

    // LP price = Total Value / Total Supply
    return totalValue / totalSupplyNum;
  } catch (error) {
    console.error('calculateLPPrice error:', error);
    return 0;
  }
}

/**
 * Calculate token price from pair reserves
 * @param reserve0 - Reserve of token0
 * @param reserve1 - Reserve of token1
 * @param token0Decimals - Decimals of token0
 * @param token1Decimals - Decimals of token1
 * @param isToken0 - Whether we want price of token0 (true) or token1 (false)
 * @returns Price of the token in terms of the other token
 */
export function calculatePriceFromReserves(
  reserve0: bigint,
  reserve1: bigint,
  token0Decimals: number,
  token1Decimals: number,
  isToken0: boolean = true
): number {
  if (reserve0 === 0n || reserve1 === 0n) return 0;

  try {
    const reserve0Num = parseFloat(formatUnits(reserve0, token0Decimals));
    const reserve1Num = parseFloat(formatUnits(reserve1, token1Decimals));

    if (isToken0) {
      // Price of token0 in terms of token1
      return reserve1Num / reserve0Num;
    } else {
      // Price of token1 in terms of token0
      return reserve0Num / reserve1Num;
    }
  } catch (error) {
    console.error('calculatePriceFromReserves error:', error);
    return 0;
  }
}

/**
 * Calculate pending rewards
 * @param userStake - User's staked amount
 * @param accRewardPerShare - Accumulated reward per share
 * @param rewardDebt - User's reward debt
 * @returns Pending reward amount
 */
export function calculatePendingRewards(
  userStake: bigint,
  accRewardPerShare: bigint,
  rewardDebt: bigint
): bigint {
  try {
    const ACC_PRECISION = 10n ** 12n; // Standard precision for MasterChef
    const pending = (userStake * accRewardPerShare) / ACC_PRECISION - rewardDebt;
    return pending > 0n ? pending : 0n;
  } catch (error) {
    console.error('calculatePendingRewards error:', error);
    return 0n;
  }
}

/**
 * Calculate gas cost in USD
 * @param gasLimit - Estimated gas limit
 * @param gasPrice - Gas price in Gwei
 * @param nativeTokenPrice - Price of native token (BNB) in USD
 * @returns Estimated cost in USD
 */
export function calculateGasCostUSD(
  gasLimit: bigint,
  gasPrice: bigint,
  nativeTokenPrice: number
): number {
  try {
    // Gas cost in wei
    const gasCostWei = gasLimit * gasPrice;

    // Convert to BNB (18 decimals)
    const gasCostBNB = parseFloat(formatUnits(gasCostWei, 18));

    // Convert to USD
    return gasCostBNB * nativeTokenPrice;
  } catch (error) {
    console.error('calculateGasCostUSD error:', error);
    return 0;
  }
}

/**
 * Calculate slippage amount
 * @param amount - Original amount
 * @param slippagePercent - Slippage percentage (e.g., 1 for 1%)
 * @returns Minimum amount after slippage
 */
export function calculateSlippage(amount: bigint, slippagePercent: number): bigint {
  try {
    const slippageBps = BigInt(Math.floor(slippagePercent * 100));
    const minAmount = amount - (amount * slippageBps / 10000n);
    return minAmount;
  } catch (error) {
    console.error('calculateSlippage error:', error);
    return amount;
  }
}

/**
 * BSC blocks per year (approximate)
 * BSC has ~3 second block time, so ~10,512,000 blocks per year
 */
export const BSC_BLOCKS_PER_YEAR = 10512000;

/**
 * Calculate daily emissions
 * @param rewardPerBlock - Reward per block
 * @param decimals - Token decimals
 * @returns Daily emissions as a number
 */
export function calculateDailyEmissions(rewardPerBlock: bigint, decimals: number = 18): number {
  try {
    const BLOCKS_PER_DAY = 28800; // BSC: 86400 / 3
    const rewardPerBlockNum = parseFloat(formatUnits(rewardPerBlock, decimals));
    return rewardPerBlockNum * BLOCKS_PER_DAY;
  } catch (error) {
    console.error('calculateDailyEmissions error:', error);
    return 0;
  }
}
