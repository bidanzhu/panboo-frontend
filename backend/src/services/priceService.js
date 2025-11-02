import { ethers } from 'ethers';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

// Minimal ABIs
const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

const ERC20_ABI = [
  'function decimals() external view returns (uint8)',
];

let provider = null;
let priceCache = {
  panbooPerBnb: '0',
  bnbPerUsd: '0',
  panbooPerUsd: '0',
  updatedAt: 0,
};

export function initPriceService(ethersProvider) {
  provider = ethersProvider;
  logger.info('Price service initialized');
}

// Get BNB/USD price from PancakeSwap WBNB/BUSD pair
export async function getBnbUsdPrice() {
  try {
    // WBNB/BUSD pair on PancakeSwap
    const wbnbBusdPair = '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16';
    const pairContract = new ethers.Contract(wbnbBusdPair, PAIR_ABI, provider);

    const [reserve0, reserve1] = await pairContract.getReserves();
    const token0 = await pairContract.token0();

    const wbnb = config.wbnb.toLowerCase();
    const isToken0Wbnb = token0.toLowerCase() === wbnb;

    // Both WBNB and BUSD have 18 decimals
    const wbnbReserve = isToken0Wbnb ? reserve0 : reserve1;
    const busdReserve = isToken0Wbnb ? reserve1 : reserve0;

    // Price = BUSD / WBNB
    const bnbPrice = Number(busdReserve) / Number(wbnbReserve);

    return bnbPrice.toString();
  } catch (error) {
    logger.error('Error fetching BNB/USD price', { error: error.message });
    return priceCache.bnbPerUsd || '300'; // Fallback to cache or default
  }
}

// Get PANBOO/BNB price from Panboo/WBNB pair
export async function getPanbooBnbPrice() {
  try {
    if (config.panbooBnbPair === '0x0000000000000000000000000000000000000000') {
      logger.warn('PANBOO/BNB pair not configured');
      return '0';
    }

    const pairContract = new ethers.Contract(config.panbooBnbPair, PAIR_ABI, provider);
    const [reserve0, reserve1] = await pairContract.getReserves();
    const token0 = await pairContract.token0();

    const panboo = config.tokenAddress.toLowerCase();
    const isToken0Panboo = token0.toLowerCase() === panboo;

    const panbooReserve = isToken0Panboo ? reserve0 : reserve1;
    const bnbReserve = isToken0Panboo ? reserve1 : reserve0;

    // Get decimals (PANBOO has 18, WBNB has 18)
    // Price = BNB / PANBOO
    const price = Number(bnbReserve) / Number(panbooReserve);

    return price.toString();
  } catch (error) {
    logger.error('Error fetching PANBOO/BNB price', { error: error.message });
    return priceCache.panbooPerBnb || '0';
  }
}

// Get all prices
export async function getAllPrices() {
  try {
    const [bnbUsd, panbooBnb] = await Promise.all([
      getBnbUsdPrice(),
      getPanbooBnbPrice(),
    ]);

    const panbooUsd = (parseFloat(panbooBnb) * parseFloat(bnbUsd)).toString();

    priceCache = {
      panbooPerBnb: panbooBnb,
      bnbPerUsd: bnbUsd,
      panbooPerUsd: panbooUsd,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    logger.debug('Prices updated', priceCache);
    return priceCache;
  } catch (error) {
    logger.error('Error fetching prices', { error: error.message });
    return priceCache;
  }
}

// Get cached prices
export function getCachedPrices() {
  return priceCache;
}

// Convert BNB amount to USD
export function bnbToUsd(bnbAmount) {
  const bnbPrice = parseFloat(priceCache.bnbPerUsd) || 300;
  const usd = parseFloat(bnbAmount) * bnbPrice;
  return usd.toString();
}
