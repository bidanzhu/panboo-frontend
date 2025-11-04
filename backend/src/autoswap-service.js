/**
 * Autoswap Service
 *
 * Monitors price and executes charity swaps when conditions are optimal
 */

import { ethers } from 'ethers';
import { logger } from './utils/logger.js';
import AutoswapStrategy from './autoswap-strategy.js';

// Token ABI (minimal - just what we need)
const TOKEN_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function swapAndDonate(uint256 tokenAmount) public',
  'function owner() external view returns (address)',
];

class AutoswapService {
  constructor(config) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.strategy = new AutoswapStrategy(config);
    this.token = new ethers.Contract(config.tokenAddress, TOKEN_ABI, this.provider);

    // Service state
    this.isRunning = false;
    this.lastCheck = null;
    this.lastSwap = null;
    this.totalSwapsExecuted = 0;

    // Price monitoring interval (default: 1 minute)
    this.monitoringInterval = config.autoswapCheckInterval || 60000; // 1 minute
    this.intervalId = null;
  }

  /**
   * Initialize the service
   */
  async init() {
    logger.info('Initializing autoswap service...');
    const initialized = await this.strategy.init();

    if (!initialized) {
      logger.error('Failed to initialize autoswap strategy');
      return false;
    }

    logger.info('Autoswap service initialized successfully');
    return true;
  }

  /**
   * Start the price monitoring service
   */
  start() {
    if (this.isRunning) {
      logger.warn('Autoswap service already running');
      return;
    }

    logger.info('Starting autoswap service', {
      checkInterval: `${this.monitoringInterval / 1000}s`,
    });

    this.isRunning = true;

    // Initial check
    this.checkAndSwap();

    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.checkAndSwap();
    }, this.monitoringInterval);
  }

  /**
   * Stop the price monitoring service
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Autoswap service not running');
      return;
    }

    logger.info('Stopping autoswap service');

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check if swap should happen and execute if conditions are met
   */
  async checkAndSwap() {
    try {
      this.lastCheck = new Date().toISOString();

      // Track volume from recent swaps (run in background, don't block)
      // Use setImmediate to avoid unhandled promise warnings
      setImmediate(() => {
        this.strategy.trackVolume()
          .catch(err => {
            logger.error('Error tracking volume in background', {
              error: err.message,
              stack: err.stack,
            });
          });
      });

      // Get accumulated tokens in contract
      const contractBalance = await this.token.balanceOf(this.config.tokenAddress);

      logger.debug('Checking autoswap conditions', {
        contractBalance: ethers.formatEther(contractBalance),
      });

      // Evaluate swap conditions
      const evaluation = await this.strategy.shouldSwap(contractBalance);

      logger.info('Autoswap evaluation complete', {
        shouldSwap: evaluation.shouldSwap,
        reason: evaluation.reason,
      });

      // Execute swap if conditions are met
      if (evaluation.shouldSwap) {
        logger.info('🎯 Conditions met - executing autoswap', evaluation);
        // Note: Actual swap execution would require a wallet with private key
        // For now, this is monitoring only - manual trigger via API
        return {
          action: 'swap_recommended',
          evaluation,
        };
      }

      return {
        action: 'no_swap',
        evaluation,
      };
    } catch (error) {
      logger.error('Error in checkAndSwap', { error: error.message, stack: error.stack });
      return {
        action: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Manually trigger swap (called via API endpoint)
   * Note: Requires owner wallet to be connected
   */
  async executeSwap(ownerWallet) {
    try {
      logger.info('Executing manual swap...');

      // Get accumulated tokens
      const contractBalance = await this.token.balanceOf(this.config.tokenAddress);

      logger.info('Swap amount', {
        tokens: ethers.formatEther(contractBalance),
      });

      // Create contract instance with signer
      const tokenWithSigner = new ethers.Contract(
        this.config.tokenAddress,
        TOKEN_ABI,
        ownerWallet
      );

      // Execute swap (pass full contract balance)
      const tx = await tokenWithSigner.swapAndDonate(contractBalance);

      logger.info('Swap transaction sent', {
        txHash: tx.hash,
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      this.lastSwap = new Date().toISOString();
      this.totalSwapsExecuted++;

      logger.info('Swap executed successfully', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        totalSwapsExecuted: this.totalSwapsExecuted,
      });

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        tokensSwapped: ethers.formatEther(contractBalance),
      };
    } catch (error) {
      logger.error('Error executing swap', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      lastSwap: this.lastSwap,
      totalSwapsExecuted: this.totalSwapsExecuted,
      monitoringInterval: this.monitoringInterval,
      strategy: this.strategy.getStatus(),
    };
  }

  /**
   * Get current evaluation without executing swap
   */
  async evaluate() {
    try {
      const contractBalance = await this.token.balanceOf(this.config.tokenAddress);
      const evaluation = await this.strategy.shouldSwap(contractBalance);

      return {
        success: true,
        ...evaluation,
      };
    } catch (error) {
      logger.error('Error evaluating swap conditions', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default AutoswapService;
