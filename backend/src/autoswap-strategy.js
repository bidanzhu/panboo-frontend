/**
 * Autoswap Strategy Module
 *
 * Determines when to swap accumulated charity tokens based on:
 * 1. Accumulated amount threshold
 * 2. Price signals (moving averages, momentum, volume)
 *
 * Strategy: Sell when price is rising to maximize BNB received
 */

import { ethers } from 'ethers';
import { logger } from './utils/logger.js';
import { queries } from './db.js';

// Uniswap V2 Pair ABI (minimal - just what we need)
const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)',
];

class AutoswapStrategy {
  constructor(config) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.pair = new ethers.Contract(config.panbooBnbPair, PAIR_ABI, this.provider);

    // Price tracking (stores last N prices in memory for fast calculation)
    this.priceHistory = []; // Array of {timestamp, price}
    this.maxHistoryLength = 60; // Keep 60 data points (1 hour if checking every minute)

    // Determine token order in pair
    this.tokenOrder = null; // Will be set in init()
  }

  /**
   * Initialize - determine which token is token0/token1 in the pair and load price history
   */
  async init() {
    try {
      const token0 = await this.pair.token0();
      const token1 = await this.pair.token1();

      // Validate token addresses were retrieved
      if (!token0 || !token1) {
        logger.error('Failed to retrieve token addresses from pair');
        return false;
      }

      // Check if PANBOO is token0 or token1
      this.tokenOrder = {
        panbooIsToken0: token0.toLowerCase() === this.config.tokenAddress.toLowerCase(),
        token0,
        token1,
      };

      logger.info('Autoswap strategy initialized', {
        panbooIsToken0: this.tokenOrder.panbooIsToken0,
        token0,
        token1,
      });

      // Load recent price history from database into memory
      const priceHistoryLoaded = await this.loadPriceHistory();

      // Validate initialization succeeded - either price history loaded or we can proceed without it
      if (!priceHistoryLoaded && this.priceHistory.length === 0) {
        logger.warn('No price history available, but continuing with initialization');
        // This is not a fatal error - strategy can work without historical data initially
      }

      return true;
    } catch (error) {
      logger.error('Error initializing autoswap strategy', { error: error.message });
      return false;
    }
  }

  /**
   * Load recent price history from database into memory
   */
  async loadPriceHistory() {
    try {
      const prices = await queries.getRecentPrices(this.maxHistoryLength);

      this.priceHistory = prices.map(p => ({
        timestamp: p.timestamp * 1000, // Convert to milliseconds
        price: parseFloat(p.price_bnb),
      }));

      logger.info('Price history loaded from database', {
        count: this.priceHistory.length,
        oldestTimestamp: this.priceHistory.length > 0
          ? new Date(this.priceHistory[0].timestamp).toISOString()
          : 'N/A',
      });

      return true;
    } catch (error) {
      logger.error('Error loading price history from database', { error: error.message });
      // Continue without historical data
      this.priceHistory = [];
      return false;
    }
  }

  /**
   * Get current PANBOO price in BNB from LP reserves
   * @returns {Promise<object|null>} Object with {price, reserve0, reserve1} or null
   */
  async getCurrentPrice() {
    try {
      const [reserve0, reserve1, blockTimestampLast] = await this.pair.getReserves();

      // Sanity check: reserves must be non-zero
      if (reserve0 === 0n || reserve1 === 0n) {
        logger.error('Invalid reserves: one or both reserves are zero', {
          reserve0: reserve0.toString(),
          reserve1: reserve1.toString(),
        });
        return null;
      }

      // Calculate price based on token order using BigInt math with scaling
      // We scale by 1e18 to maintain precision during division
      let price, reservePanboo, reserveBnb;
      const SCALE = 10n ** 18n;

      if (this.tokenOrder.panbooIsToken0) {
        // PANBOO is token0, BNB is token1
        // Price = reserve1 / reserve0 (BNB per PANBOO)
        // Scale up numerator before division to preserve precision
        const scaledPrice = (reserve1 * SCALE) / reserve0;
        price = Number(scaledPrice) / 1e18; // Convert to float only for display
        reservePanboo = reserve0.toString();
        reserveBnb = reserve1.toString();
      } else {
        // BNB is token0, PANBOO is token1
        // Price = reserve0 / reserve1 (BNB per PANBOO)
        const scaledPrice = (reserve0 * SCALE) / reserve1;
        price = Number(scaledPrice) / 1e18; // Convert to float only for display
        reservePanboo = reserve1.toString();
        reserveBnb = reserve0.toString();
      }

      return { price, reservePanboo, reserveBnb };
    } catch (error) {
      logger.error('Error getting current price', { error: error.message });
      return null;
    }
  }

  /**
   * Update price history with new data point (saves to both memory and database)
   */
  async updatePriceHistory() {
    const priceData = await this.getCurrentPrice();

    if (priceData === null) return false;

    const timestamp = Date.now();
    const timestampSeconds = Math.floor(timestamp / 1000);

    // Add to in-memory history
    this.priceHistory.push({
      timestamp,
      price: priceData.price,
    });

    // Keep only last N data points in memory
    if (this.priceHistory.length > this.maxHistoryLength) {
      this.priceHistory.shift();
    }

    // Save to database (permanent storage)
    try {
      await queries.insertPrice({
        timestamp: timestampSeconds,
        priceBnb: priceData.price.toString(),
        reservePanboo: priceData.reservePanboo,
        reserveBnb: priceData.reserveBnb,
      });

      logger.debug('Price updated and saved', {
        price: priceData.price.toFixed(12),
        historyLength: this.priceHistory.length,
        reservePanboo: priceData.reservePanboo,
        reserveBnb: priceData.reserveBnb,
      });
    } catch (error) {
      logger.error('Error saving price to database', { error: error.message });
      // Continue even if DB save fails (in-memory data is updated)
    }

    return true;
  }

  /**
   * Track volume from recent Swap events
   * Fetches recent swap events and stores them in database
   */
  async trackVolume() {
    try {
      // Get last processed block from database (using MAX block_number)
      const lastBlock = await queries.getLastSwapBlock();

      // Get current block
      const currentBlock = await this.provider.getBlockNumber();

      // Don't query too many blocks at once (limit to 1000 blocks)
      const fromBlock = Math.max(lastBlock + 1, currentBlock - 1000);

      if (fromBlock > currentBlock) {
        return; // No new blocks to process
      }

      // Query Swap events
      const filter = this.pair.filters.Swap();
      const events = await this.pair.queryFilter(filter, fromBlock, currentBlock);

      logger.debug(`Found ${events.length} swap events from block ${fromBlock} to ${currentBlock}`);

      // Process and store each swap
      for (const event of events) {
        const block = await event.getBlock();

        // Normalize trader attribution (router → EOA)
        const receipt = await this.provider.getTransactionReceipt(event.transactionHash);
        let sender = event.args.sender;
        if (sender.toLowerCase() === this.config.pancakeRouter.toLowerCase()) {
          sender = receipt.from; // Use actual EOA who signed the transaction
        }

        // Calculate volume in BNB using BigInt math (no precision loss)
        let volumeBnbWei;
        if (this.tokenOrder.panbooIsToken0) {
          // If PANBOO is token0, BNB is token1
          // Volume = amount1In + amount1Out (in wei)
          volumeBnbWei = event.args.amount1In + event.args.amount1Out;
        } else {
          // If BNB is token0, PANBOO is token1
          // Volume = amount0In + amount0Out (in wei)
          volumeBnbWei = event.args.amount0In + event.args.amount0Out;
        }

        await queries.insertSwapEvent({
          txHash: event.transactionHash,
          logIndex: event.index,
          blockNumber: event.blockNumber,
          timestamp: block.timestamp,
          sender: sender,
          amount0In: event.args.amount0In.toString(),
          amount1In: event.args.amount1In.toString(),
          amount0Out: event.args.amount0Out.toString(),
          amount1Out: event.args.amount1Out.toString(),
          to: event.args.to,
          volumeBnb: volumeBnbWei.toString(), // Store wei as string for precision
        });
      }

      if (events.length > 0) {
        logger.info(`Tracked ${events.length} swap events, volume updated`);
      }

      return events.length;
    } catch (error) {
      logger.error('Error tracking volume', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate moving average over N periods
   * @param {number} periods - Number of periods to average
   * @returns {number|null} Moving average or null if insufficient data
   */
  getMovingAverage(periods) {
    if (this.priceHistory.length < periods) {
      return null;
    }

    const recentPrices = this.priceHistory.slice(-periods).map(p => p.price);
    const sum = recentPrices.reduce((a, b) => a + b, 0);
    return sum / periods;
  }

  /**
   * Calculate price change percentage over N periods
   * @param {number} periods - Number of periods to check
   * @returns {number|null} Percentage change or null if insufficient data
   */
  getPriceChangePercent(periods) {
    if (this.priceHistory.length < periods + 1) {
      return null;
    }

    const oldPrice = this.priceHistory[this.priceHistory.length - periods - 1].price;
    const currentPrice = this.priceHistory[this.priceHistory.length - 1].price;

    return ((currentPrice - oldPrice) / oldPrice) * 100;
  }

  /**
   * Determine if conditions are met for autoswap
   * @param {bigint} accumulatedTokens - Amount of tokens accumulated
   * @returns {Promise<{shouldSwap: boolean, reason: string, signals: object}>}
   */
  async shouldSwap(accumulatedTokens) {
    // Update price history
    await this.updatePriceHistory();

    const swapAtAmount = ethers.parseEther(this.config.swapAtAmount || '1000');

    // Check 1: Minimum accumulated amount
    if (accumulatedTokens < swapAtAmount) {
      return {
        shouldSwap: false,
        reason: 'Accumulated amount below threshold',
        signals: {},
        accumulatedTokens: ethers.formatEther(accumulatedTokens),
        threshold: ethers.formatEther(swapAtAmount),
      };
    }

    // If not enough price history, swap based on amount only
    if (this.priceHistory.length < 15) {
      return {
        shouldSwap: true,
        reason: 'Insufficient price history - swapping based on amount only',
        signals: {},
        accumulatedTokens: ethers.formatEther(accumulatedTokens),
      };
    }

    // Check price signals
    const currentPrice = this.priceHistory[this.priceHistory.length - 1].price;
    const ma5 = this.getMovingAverage(5);
    const ma15 = this.getMovingAverage(15);
    const priceChange10min = this.getPriceChangePercent(10);
    const priceChange30min = this.getPriceChangePercent(30);

    const signals = {
      // Signal 1: Short-term MA above long-term MA (uptrend)
      uptrend: ma5 !== null && ma15 !== null && ma5 > ma15,

      // Signal 2: Current price above short-term MA
      aboveMA: ma5 !== null && currentPrice > ma5,

      // Signal 3: Recent price gain (last 10 minutes)
      recentGain: priceChange10min !== null && priceChange10min > 0.5, // 0.5% gain

      // Signal 4: Not in sharp downtrend
      notDumping: priceChange30min !== null && priceChange30min > -2, // Not down >2% in 30min

      // Signal 5: Price stable or rising (last 10 min vs 30 min)
      momentum: priceChange10min !== null && priceChange30min !== null &&
                priceChange10min >= priceChange30min * 0.5,
    };

    // Count positive signals
    const positiveSignals = Object.values(signals).filter(Boolean).length;
    const totalSignals = Object.keys(signals).length;

    // Require at least 3/5 positive signals
    const shouldSwap = positiveSignals >= 3;

    const result = {
      shouldSwap,
      reason: shouldSwap
        ? `${positiveSignals}/${totalSignals} positive signals - good time to swap`
        : `Only ${positiveSignals}/${totalSignals} positive signals - waiting for better price`,
      signals,
      priceData: {
        currentPrice: currentPrice.toFixed(12),
        ma5: ma5?.toFixed(12),
        ma15: ma15?.toFixed(12),
        priceChange10min: priceChange10min?.toFixed(2) + '%',
        priceChange30min: priceChange30min?.toFixed(2) + '%',
      },
      accumulatedTokens: ethers.formatEther(accumulatedTokens),
      threshold: ethers.formatEther(swapAtAmount),
    };

    logger.info('Autoswap evaluation', result);

    return result;
  }

  /**
   * Get current strategy status
   */
  getStatus() {
    const currentPrice = this.priceHistory[this.priceHistory.length - 1]?.price;

    return {
      priceHistoryLength: this.priceHistory.length,
      currentPrice: currentPrice?.toFixed(12),
      ma5: this.getMovingAverage(5)?.toFixed(12),
      ma15: this.getMovingAverage(15)?.toFixed(12),
      priceChange10min: this.getPriceChangePercent(10)?.toFixed(2) + '%',
      priceChange30min: this.getPriceChangePercent(30)?.toFixed(2) + '%',
      priceHistory: this.priceHistory.slice(-10), // Last 10 prices
    };
  }
}

export default AutoswapStrategy;
