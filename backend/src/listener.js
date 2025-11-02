import { ethers } from 'ethers';
import { config } from './config.js';
import { getDatabase, queries } from './db.js';
import { initPriceService, getAllPrices, bnbToUsd } from './services/priceService.js';
import { logger } from './utils/logger.js';

// ABIs
const TOKEN_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function decimals() external view returns (uint8)',
];

const MASTERCHEF_ABI = [
  'event Deposit(address indexed user, uint256 indexed pid, uint256 amount)',
  'event Withdraw(address indexed user, uint256 indexed pid, uint256 amount)',
  'event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount)',
  'event Harvest(address indexed user, uint256 indexed pid, uint256 amount)',
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
  const latestBlock = await provider.getBlockNumber();
  const lastProcessed = (await queries.getLastBlock()) || latestBlock;

  if (latestBlock <= lastProcessed) {
    logger.debug('No new blocks');
    return;
  }

  const fromBlock = lastProcessed + 1;
  const toBlock = Math.min(fromBlock + 100, latestBlock); // Process max 100 blocks at a time

  logger.info('Processing blocks', { from: fromBlock, to: toBlock });

  try {
    // Fetch all events in parallel
    const [transferEvents, depositEvents, withdrawEvents, harvestEvents] = await Promise.all([
      tokenContract.queryFilter('Transfer', fromBlock, toBlock),
      masterChefContract.queryFilter('Deposit', fromBlock, toBlock),
      masterChefContract.queryFilter('Withdraw', fromBlock, toBlock),
      masterChefContract.queryFilter('Harvest', fromBlock, toBlock),
    ]);

    // Process transfers
    for (const event of transferEvents) {
      await processTransfer(event);
    }

    // Process farm events
    for (const event of depositEvents) {
      await processFarmEvent(event, 'deposit');
    }

    for (const event of withdrawEvents) {
      await processFarmEvent(event, 'withdraw');
    }

    for (const event of harvestEvents) {
      await processFarmEvent(event, 'harvest');
    }

    // Update last processed block
    await queries.setLastBlock(toBlock);

    logger.info('Blocks processed', {
      from: fromBlock,
      to: toBlock,
      transfers: transferEvents.length,
      deposits: depositEvents.length,
      withdraws: withdrawEvents.length,
      harvests: harvestEvents.length,
    });
  } catch (error) {
    logger.error('Error processing blocks', { error: error.message, from: fromBlock, to: toBlock });
  }
}

async function processTransfer(event) {
  try {
    const { from, to, value } = event.args;
    const block = await event.getBlock();

    // Save transfer
    await queries.insertTransfer({
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: block.timestamp,
      from: from,
      to: to,
      amount: value.toString(),
    });

    // Check if it's a charity transfer
    if (to.toLowerCase() === config.charityWallet.toLowerCase()) {
      // It's a BNB transfer to charity, not PANBOO
      // We need to get the actual transaction to see BNB amount
      const tx = await provider.getTransaction(event.transactionHash);
      const receipt = await provider.getTransactionReceipt(event.transactionHash);

      // Check for BNB transfers in transaction logs
      // For swapAndDonate, there will be a WBNB transfer
      // We'll track the PANBOO amount sent to charity

      const amountBnb = ethers.formatEther(value); // Assuming value is in wei
      const amountUsd = bnbToUsd(amountBnb);

      await queries.insertCharity({
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block.timestamp,
        from: from,
        amountBnb: amountBnb,
        amountUsd: amountUsd,
      });

      // Add to live feed
      await queries.insertFeed({
        timestamp: block.timestamp,
        eventType: 'donation',
        user: from,
        amount: amountUsd,
        metadata: { txHash: event.transactionHash },
      });

      logger.info('Charity donation recorded', {
        from,
        amountBnb,
        amountUsd,
      });
    }

    // Add large transfers to live feed
    const valueInEther = parseFloat(ethers.formatEther(value));
    if (valueInEther > 1000) {
      // Threshold for "large" transfers
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
    const { user, pid, amount } = event.args;
    const block = await event.getBlock();

    await queries.insertFarmEvent({
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: block.timestamp,
      user: user,
      poolId: Number(pid),
      eventType: eventType,
      amount: amount.toString(),
    });

    // Add to live feed
    await queries.insertFeed({
      timestamp: block.timestamp,
      eventType: `farm_${eventType}`,
      user: user,
      amount: amount.toString(),
      metadata: { poolId: Number(pid), txHash: event.transactionHash },
    });

    logger.debug(`Farm ${eventType} recorded`, {
      user,
      poolId: Number(pid),
      amount: ethers.formatEther(amount),
    });
  } catch (error) {
    logger.error(`Error processing farm ${eventType}`, {
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
