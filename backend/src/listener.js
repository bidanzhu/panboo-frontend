import { ethers } from 'ethers';
import { config } from './config.js';
import { getDatabase, queries } from './db.js';
import { initPriceService, getAllPrices, bnbToUsdAt } from './services/priceService.js';
import { logger } from './utils/logger.js';

// ABIs
const TOKEN_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Donated(uint256 tokensSold, uint256 bnbSent, address indexed to, uint256 timestamp)',
  'function decimals() external view returns (uint8)',
];

const MASTERCHEF_ABI = [
  'event Deposit(address indexed user, uint256 indexed pid, uint256 amount)',
  'event Withdraw(address indexed user, uint256 indexed pid, uint256 amount)',
  'event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount)',
  'event Harvest(address indexed user, uint256 indexed pid, uint256 amount)',
];

// PancakeSwap Pair ABI (for identifying traders from Swap events)
const PAIR_SWAP_ABI = [
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
];

let provider = null;
let tokenContract = null;
let masterChefContract = null;
let isRunning = false;

export async function startListener() {
  logger.info('Starting blockchain listener...');

  // Initialize provider
  provider = new ethers.JsonRpcProvider(config.rpcUrl);
  initPriceService(provider);

  // Initialize contracts
  tokenContract = new ethers.Contract(config.tokenAddress, TOKEN_ABI, provider);
  masterChefContract = new ethers.Contract(config.masterChefAddress, MASTERCHEF_ABI, provider);

  // Get starting block
  const lastBlock = await queries.getLastBlock();
  let currentBlock = lastBlock;

  if (!currentBlock || config.startBlock > 0) {
    currentBlock = config.startBlock || await provider.getBlockNumber();
    await queries.setLastBlock(currentBlock);
    logger.info('Starting from block', { block: currentBlock });
  } else {
    logger.info('Resuming from last block', { block: currentBlock });
  }

  isRunning = true;

  // Start polling loop
  pollEvents();

  logger.info('Listener started successfully');
}

export function stopListener() {
  isRunning = false;
  logger.info('Listener stopped');
}

async function pollEvents() {
  while (isRunning) {
    try {
      await processNewBlocks();
      await updatePrices();
    } catch (error) {
      logger.error('Error in poll loop', { error: error.message, stack: error.stack });
    }

    // Wait before next poll
    await sleep(config.pollInterval);
  }
}

async function processNewBlocks() {
  const CONFIRMATION_BLOCKS = 10; // Wait for 10 confirmations to avoid reorgs
  const BACKFILL_WINDOW = 50; // Reprocess last N blocks to auto-recover missed events
  const latestBlock = await provider.getBlockNumber();
  const confirmedBlock = latestBlock - CONFIRMATION_BLOCKS;
  const lastProcessed = (await queries.getLastBlock()) || confirmedBlock;

  if (confirmedBlock <= lastProcessed) {
    logger.debug('No new confirmed blocks');
    return;
  }

  // Start from 50 blocks earlier to auto-recover missed events (INSERT OR IGNORE prevents duplicates)
  const fromBlock = Math.max(lastProcessed - BACKFILL_WINDOW + 1, config.startBlock || 0);
  const toBlock = Math.min(fromBlock + 100, confirmedBlock); // Process max 100 blocks at a time

  logger.info('Processing blocks', { from: fromBlock, to: toBlock, latest: latestBlock, lag: latestBlock - toBlock });

  let hadFailure = false;

  try {
    // Fetch all events in parallel
    const [transferEvents, depositEvents, withdrawEvents, harvestEvents, donatedEvents] = await Promise.all([
      tokenContract.queryFilter('Transfer', fromBlock, toBlock),
      masterChefContract.queryFilter('Deposit', fromBlock, toBlock),
      masterChefContract.queryFilter('Withdraw', fromBlock, toBlock),
      masterChefContract.queryFilter('Harvest', fromBlock, toBlock),
      tokenContract.queryFilter('Donated', fromBlock, toBlock),
    ]);

    // Process transfers
    for (const event of transferEvents) {
      try {
        await processTransfer(event);
      } catch (err) {
        hadFailure = true;
        logger.error('Failed to process transfer event', { error: err.message, txHash: event.transactionHash });
      }
    }

    // Process farm events
    for (const event of depositEvents) {
      try {
        await processFarmEvent(event, 'deposit');
      } catch (err) {
        hadFailure = true;
        logger.error('Failed to process deposit event', { error: err.message, txHash: event.transactionHash });
      }
    }

    for (const event of withdrawEvents) {
      try {
        await processFarmEvent(event, 'withdraw');
      } catch (err) {
        hadFailure = true;
        logger.error('Failed to process withdraw event', { error: err.message, txHash: event.transactionHash });
      }
    }

    for (const event of harvestEvents) {
      try {
        await processFarmEvent(event, 'harvest');
      } catch (err) {
        hadFailure = true;
        logger.error('Failed to process harvest event', { error: err.message, txHash: event.transactionHash });
      }
    }

    // Process donations (BNB delivered to charity)
    for (const event of donatedEvents) {
      try {
        await processDonation(event);
      } catch (err) {
        hadFailure = true;
        logger.error('Failed to process donation event', { error: err.message, txHash: event.transactionHash });
      }
    }

    // Update last processed block only if no failures
    if (!hadFailure) {
      await queries.setLastBlock(toBlock);
    } else {
      logger.warn('Skipping block advancement due to failures', { from: fromBlock, to: toBlock });
    }

    logger.info('Blocks processed', {
      from: fromBlock,
      to: toBlock,
      transfers: transferEvents.length,
      deposits: depositEvents.length,
      withdraws: withdrawEvents.length,
      harvests: harvestEvents.length,
      donations: donatedEvents.length,
    });
  } catch (error) {
    logger.error('Error processing blocks', { error: error.message, from: fromBlock, to: toBlock });
  }
}

/**
 * Identifies the actual trader from a transaction.
 * If `from` is the pair address, parses Swap events to find the real trader.
 * @param {string} txHash - Transaction hash
 * @param {string} from - The 'from' address from Transfer event
 * @returns {Promise<string>} - The actual trader address
 */
async function identifyTrader(txHash, from) {
  try {
    // Check if from is the pair address
    if (from.toLowerCase() !== config.panbooBnbPair.toLowerCase()) {
      // Not from pair, use the from address as-is
      return from;
    }

    // From is the pair, need to find the actual trader from Swap event
    const receipt = await provider.getTransactionReceipt(txHash);
    const pairInterface = new ethers.Interface(PAIR_SWAP_ABI);

    // Parse all logs looking for Swap events from the pair
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === config.panbooBnbPair.toLowerCase()) {
        try {
          const parsed = pairInterface.parseLog(log);
          if (parsed && parsed.name === 'Swap') {
            // The 'sender' in Swap event is the actual trader (or router acting for them)
            // If sender is the PancakeRouter, use the transaction EOA instead
            let trader = parsed.args.sender;

            if (trader.toLowerCase() === config.pancakeRouter.toLowerCase()) {
              // Sender is router, use the actual EOA who signed the transaction
              trader = receipt.from;

              logger.debug('Swap through router, using EOA', {
                txHash,
                router: parsed.args.sender,
                actualEOA: trader,
              });
            } else {
              logger.debug('Direct swap (not through router)', {
                txHash,
                trader,
              });
            }

            return trader;
          }
        } catch (parseError) {
          // Not a Swap event, continue
        }
      }
    }

    // Couldn't find Swap event, fall back to from address
    logger.warn('Could not identify trader from Swap event, using Transfer from', {
      txHash,
      from,
    });
    return from;
  } catch (error) {
    logger.error('Error identifying trader', { error: error.message, txHash });
    return from; // Fall back to from address
  }
}

async function processTransfer(event) {
  try {
    // Validate event structure
    if (!event || !event.args) {
      logger.warn('Invalid transfer event structure', { event });
      return;
    }

    const { from, to, value } = event.args;

    // Validate required fields
    if (!from || !to || value === undefined || value === null) {
      logger.warn('Invalid transfer event args', {
        txHash: event.transactionHash,
        from,
        to,
        value: value?.toString(),
      });
      return;
    }

    const block = await event.getBlock();

    // Validate block was retrieved
    if (!block || !block.timestamp) {
      logger.warn('Could not retrieve block for transfer', {
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
      });
      return;
    }

    // Save transfer (store as wei string - no precision loss)
    await queries.insertTransfer({
      txHash: event.transactionHash,
      logIndex: event.index,
      blockNumber: event.blockNumber,
      timestamp: block.timestamp,
      from: from,
      to: to,
      amount: value.toString(), // Store as wei string
    });

    // Check if it's a tax transfer to contract (pledge)
    if (to.toLowerCase() === config.tokenAddress.toLowerCase()) {
      // Identify the actual trader (in case from is the pair address)
      const actualTrader = await identifyTrader(event.transactionHash, from);

      // This is tax collected to contract (pledged PANBOO - will be swapped later)
      await queries.insertCharity({
        txHash: event.transactionHash,
        logIndex: event.index,
        blockNumber: event.blockNumber,
        timestamp: block.timestamp,
        from: actualTrader, // Use actual trader, not pair address
        contributionType: 'pledged',
        amountBnb: '0',
        amountPanboo: value.toString(), // Store as wei string
        amountUsd: null,
      });

      logger.info('Tax collected to contract (pledged)', {
        from: actualTrader,
        originalFrom: from,
        amountPanboo: ethers.formatEther(value),
        txHash: event.transactionHash,
      });
    }

    // Add large transfers to live feed (using BigInt comparison)
    const LARGE_THRESHOLD = ethers.parseEther('1000');
    if (value >= LARGE_THRESHOLD) {
      await queries.insertFeed({
        timestamp: block.timestamp,
        eventType: 'transfer',
        user: from,
        amount: value.toString(),
        metadata: { to, txHash: event.transactionHash },
      });
    }
  } catch (error) {
    logger.error('Error processing transfer', { error: error.message, txHash: event.transactionHash });
  }
}

async function processFarmEvent(event, eventType) {
  try {
    // Validate event structure
    if (!event || !event.args) {
      logger.warn('Invalid farm event structure', { event, eventType });
      return;
    }

    const { user, pid, amount } = event.args;

    // Validate required fields
    if (!user || pid === undefined || pid === null || amount === undefined || amount === null) {
      logger.warn('Invalid farm event args', {
        txHash: event.transactionHash,
        eventType,
        user,
        pid: pid?.toString(),
        amount: amount?.toString(),
      });
      return;
    }

    const block = await event.getBlock();

    // Validate block was retrieved
    if (!block || !block.timestamp) {
      logger.warn('Could not retrieve block for farm event', {
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        eventType,
      });
      return;
    }

    // Store as wei string for precision
    await queries.insertFarmEvent({
      txHash: event.transactionHash,
      logIndex: event.index,
      blockNumber: event.blockNumber,
      timestamp: block.timestamp,
      user: user,
      poolId: Number(pid),
      eventType: eventType,
      amount: amount.toString(), // Store as wei string
    });

    // Add to live feed
    await queries.insertFeed({
      timestamp: block.timestamp,
      eventType: `farm_${eventType}`,
      user: user,
      amount: amount.toString(), // Store as wei string
      metadata: { poolId: Number(pid), txHash: event.transactionHash },
    });

    logger.debug(`Farm ${eventType} recorded`, {
      user,
      poolId: Number(pid),
      amount: ethers.formatEther(amount), // Only format for logging
    });
  } catch (error) {
    logger.error(`Error processing farm ${eventType}`, {
      error: error.message,
      txHash: event.transactionHash,
    });
  }
}

async function processDonation(event) {
  try {
    // Validate event structure
    if (!event || !event.args) {
      logger.warn('Invalid donation event structure', { event });
      return;
    }

    const { tokensSold, bnbSent, to, timestamp } = event.args;

    // Validate required fields
    if (tokensSold === undefined || tokensSold === null || bnbSent === undefined || bnbSent === null || !to || timestamp === undefined || timestamp === null) {
      logger.warn('Invalid donation event args', {
        txHash: event.transactionHash,
        tokensSold: tokensSold?.toString(),
        bnbSent: bnbSent?.toString(),
        to,
        timestamp: timestamp?.toString(),
      });
      return;
    }

    const block = await event.getBlock();

    // Validate block was retrieved
    if (!block || !block.timestamp) {
      logger.warn('Could not retrieve block for donation', {
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
      });
      return;
    }

    const amountBnb = ethers.formatEther(bnbSent);
    const amountPanboo = ethers.formatEther(tokensSold);
    const amountUsd = bnbToUsdAt(parseFloat(amountBnb), block.timestamp);

    // Record delivered BNB donation (from contract autoswap)
    await queries.insertCharity({
      txHash: event.transactionHash,
      logIndex: event.index,
      blockNumber: event.blockNumber,
      timestamp: block.timestamp,
      from: config.tokenAddress, // Contract address (collective donation)
      contributionType: 'delivered',
      amountBnb: bnbSent.toString(), // Store as wei string
      amountPanboo: tokensSold.toString(), // Store PANBOO amount that was swapped
      amountUsd: amountUsd.toString(),
    });

    // Add to live feed (only delivered donations)
    await queries.insertFeed({
      timestamp: block.timestamp,
      eventType: 'donation',
      user: config.tokenAddress, // Show as contract donation
      amount: amountUsd.toString(),
      metadata: {
        txHash: event.transactionHash,
        panbooSwapped: tokensSold.toString(),
        bnbDonated: bnbSent.toString(),
      },
    });

    logger.info('Delivered BNB donation recorded', {
      from: 'contract',
      amountPanboo,
      amountBnb,
      amountUsd,
      txHash: event.transactionHash,
    });
  } catch (error) {
    logger.error('Error processing donation', {
      error: error.message,
      txHash: event.transactionHash,
    });
  }
}

async function updatePrices() {
  try {
    await getAllPrices();
  } catch (error) {
    logger.error('Error updating prices', { error: error.message });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  stopListener();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  stopListener();
  process.exit(0);
});
