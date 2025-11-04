import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import Decimal from 'decimal.js';
import { config } from './config.js';
import { getDatabase, queries } from './db.js';
import { getCachedPrices } from './services/priceService.js';
import { logger } from './utils/logger.js';
import AutoswapService from './autoswap-service.js';

const app = express();

// Initialize provider for blockchain queries
const provider = new ethers.JsonRpcProvider(config.rpcUrl);
const TOKEN_ABI = ['function balanceOf(address account) external view returns (uint256)'];
const tokenContract = new ethers.Contract(config.tokenAddress, TOKEN_ABI, provider);

// Initialize Autoswap Service (will be initialized after database is ready)
let autoswapService = null;

// Function to initialize autoswap service after database is ready
async function initAutoswapService() {
  try {
    autoswapService = new AutoswapService({
      rpcUrl: config.rpcUrl,
      tokenAddress: config.tokenAddress,
      panbooBnbPair: config.panbooBnbPair,
      pancakeRouter: config.pancakeRouter,
      swapAtAmount: config.swapAtAmount || '1000', // Default 1000 tokens
      autoswapCheckInterval: config.autoswapCheckInterval || 60000, // Default 1 minute
    });

    // Initialize and start the service
    const initialized = await autoswapService.init();
    if (initialized) {
      autoswapService.start();
      logger.info('Autoswap service started successfully');
    } else {
      logger.error('Failed to initialize autoswap service');
    }
  } catch (error) {
    logger.error('Error creating autoswap service', { error: error.message });
  }
}

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

// GET /config - Backend configuration (for Admin panel)
app.get('/config', (req, res) => {
  try {
    res.json({
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      pollInterval: config.pollInterval,
      pollIntervalMinutes: (config.pollInterval / 60000).toFixed(1),
      pollIntervalHours: (config.pollInterval / 3600000).toFixed(2),
      tokenAddress: config.tokenAddress,
      masterChefAddress: config.masterChefAddress,
      charityWallet: config.charityWallet,
      panbooBnbPair: config.panbooBnbPair,
      port: config.port,
      logLevel: config.logLevel,
    });
  } catch (error) {
    logger.error('Error fetching config', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Token Endpoints ====================

// GET /token/price - Current token price
app.get('/token/price', (req, res) => {
  try {
    const prices = getCachedPrices();
    res.json(prices);
  } catch (error) {
    logger.error('Error fetching token price', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /token/price/history?hours=24 - Price history for charts
app.get('/token/price/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;

    // Validate hours (max 30 days)
    if (hours > 720) {
      return res.status(400).json({ error: 'Maximum 720 hours (30 days) allowed' });
    }

    const history = await queries.getPriceHistory(hours);
    const stats = await queries.getPriceStats(hours);
    const volumeStats = await queries.getVolumeStats(hours);

    res.json({
      hours,
      dataPoints: history.length,
      prices: history.map(p => ({
        timestamp: p.timestamp,
        price: parseFloat(p.price_bnb),
        reservePanboo: p.reserve_panboo,
        reserveBnb: p.reserve_bnb,
      })),
      stats: stats ? {
        dataPoints: stats.data_points,
        minPrice: parseFloat(stats.min_price),
        maxPrice: parseFloat(stats.max_price),
        avgPrice: parseFloat(stats.avg_price),
        priceChange: stats.data_points > 1
          ? ((parseFloat(stats.max_price) - parseFloat(stats.min_price)) / parseFloat(stats.min_price) * 100).toFixed(2) + '%'
          : '0%',
        timeRange: {
          from: stats.first_timestamp,
          to: stats.last_timestamp,
        },
      } : null,
      volume: {
        totalBnb: parseFloat(volumeStats.total_volume_bnb || 0),
        swapCount: volumeStats.swap_count || 0,
        buys: volumeStats.buys || 0,
        sells: volumeStats.sells || 0,
      },
    });
  } catch (error) {
    logger.error('Error fetching price history', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Charity Endpoints ====================

// GET /charity/summary - Total charity summary
app.get('/charity/summary', async (req, res) => {
  try {
    const stats = await queries.getCharityStats();

    // Get pending PANBOO balance in contract (pledged but not yet swapped)
    const pendingPanbooWei = await tokenContract.balanceOf(config.tokenAddress);
    const pendingPanboo = ethers.formatEther(pendingPanbooWei);

    // Convert pending PANBOO to BNB/USD using current prices
    const prices = getCachedPrices();
    const panbooPerBnb = parseFloat(prices.panbooPerBnb) || 0;
    const panbooPerUsd = parseFloat(prices.panbooPerUsd) || 0;
    const pendingBnb = parseFloat(pendingPanboo) * panbooPerBnb;
    const pendingUsd = parseFloat(pendingPanboo) * panbooPerUsd;

    const summary = {
      totalDonatedBnb: stats.total_bnb?.toString() || '0',
      totalDonatedUsd: stats.total_usd?.toString() || '0',
      txCount: stats.tx_count || 0,
      pendingPanboo: pendingPanboo,
      pendingBnb: pendingBnb.toString(),
      pendingUsd: pendingUsd.toString(),
      updatedAt: Math.floor(Date.now() / 1000),
    };

    res.json(summary);
  } catch (error) {
    logger.error('Error fetching charity summary', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /charity/recent?limit=10 - Recent donations
app.get('/charity/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const donations = await queries.getRecentDonations(limit);

    const formatted = donations.map((d) => ({
      txHash: d.tx_hash,
      timestamp: d.timestamp,
      from: d.from_address,
      amountBnb: d.amount_bnb,
      amountUsd: d.amount_usd,
    }));

    res.json(formatted);
  } catch (error) {
    logger.error('Error fetching recent donations', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /charity/top?limit=10 - Top donors (by pledged PANBOO)
app.get('/charity/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get all raw pledges (avoid REAL precision loss)
    const rows = await queries.getTopDonorsRaw();

    // Sum per address using Decimal for precision
    const map = new Map();
    for (const r of rows) {
      const key = r.from_address.toLowerCase();
      const prev = map.get(key) || new Decimal(0);
      map.set(key, prev.plus(new Decimal(r.amount_panboo || '0')));
    }

    // Convert to BNB/USD using current prices
    const prices = getCachedPrices();
    const panbooBnb = new Decimal(prices.panbooPerBnb || 0);
    const panbooUsd = new Decimal(prices.panbooPerUsd || 0);

    const formatted = [...map.entries()]
      .map(([address, totalPanboo]) => ({
        address,
        totalBnb: totalPanboo.mul(panbooBnb).toString(),
        totalUsd: totalPanboo.mul(panbooUsd).toString(),
        txCount: rows.filter(r => r.from_address.toLowerCase() === address).length,
      }))
      .sort((a, b) => new Decimal(b.totalUsd).cmp(a.totalUsd))
      .slice(0, limit);

    res.json(formatted);
  } catch (error) {
    logger.error('Error fetching top donors', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /charity/daily?days=30 - Daily donation stats
app.get('/charity/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const daily = await queries.getDailyDonations(days);

    const formatted = daily.map((d) => ({
      date: d.date,
      totalBnb: d.total_bnb?.toString() || '0',
      totalUsd: d.total_usd?.toString() || '0',
      txCount: d.tx_count || 0,
    }));

    res.json(formatted);
  } catch (error) {
    logger.error('Error fetching daily donations', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Autoswap Endpoints ====================

// GET /autoswap/status - Get autoswap service status
app.get('/autoswap/status', (req, res) => {
  try {
    if (!autoswapService) {
      return res.status(503).json({ error: 'Autoswap service not initialized' });
    }

    const status = autoswapService.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Error fetching autoswap status', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /autoswap/evaluate - Evaluate current swap conditions
app.get('/autoswap/evaluate', async (req, res) => {
  try {
    if (!autoswapService) {
      return res.status(503).json({ error: 'Autoswap service not initialized' });
    }

    const evaluation = await autoswapService.evaluate();
    res.json(evaluation);
  } catch (error) {
    logger.error('Error evaluating autoswap', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /autoswap/execute - Manually trigger swap (owner only)
// Note: This endpoint is for monitoring only. Actual swap execution
// requires the owner to sign the transaction from the frontend.
app.post('/autoswap/execute', async (req, res) => {
  try {
    if (!autoswapService) {
      return res.status(503).json({ error: 'Autoswap service not initialized' });
    }

    // Get current evaluation
    const evaluation = await autoswapService.evaluate();

    // Return recommendation (frontend will execute the actual transaction)
    res.json({
      recommendation: evaluation.shouldSwap ? 'execute_swap' : 'wait',
      evaluation,
      note: 'Execute the swap transaction from the Admin panel in the frontend',
    });
  } catch (error) {
    logger.error('Error in autoswap execute', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /autoswap/enabled - Get autoswap enabled/disabled state
app.get('/autoswap/enabled', async (req, res) => {
  try {
    const enabled = await queries.getAutoswapEnabled();
    res.json({ enabled });
  } catch (error) {
    logger.error('Error getting autoswap enabled state', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /autoswap/enabled - Enable or disable autoswap
app.post('/autoswap/enabled', async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    await queries.setAutoswapEnabled(enabled);

    // Start or stop the service based on the new state
    if (!autoswapService) {
      return res.status(503).json({ error: 'Autoswap service not initialized' });
    }

    if (enabled) {
      await autoswapService.start();
      logger.info('Autoswap service started via API');
    } else {
      autoswapService.stop();
      logger.info('Autoswap service stopped via API');
    }

    res.json({
      success: true,
      enabled,
      message: `Autoswap ${enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    logger.error('Error setting autoswap enabled state', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Farm Endpoints ====================

// GET /farms/pools - All farm pools with stats
app.get('/farms/pools', async (req, res) => {
  try {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM pool_states');
    const pools = result.rows;

    const formatted = pools.map((p) => ({
      poolId: p.pool_id,
      lpToken: p.lp_token,
      allocPoint: p.alloc_point,
      totalStaked: p.total_staked,
      rewardPerBlock: p.reward_per_block,
      lastRewardBlock: p.last_reward_block,
      lastUpdated: p.last_updated,
      // APR calculation would go here if we have TVL
      apr: '0',
      tvl: '0',
    }));

    res.json(formatted);
  } catch (error) {
    logger.error('Error fetching farm pools', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /farms/summary - Farms summary
app.get('/farms/summary', async (req, res) => {
  try {
    const db = getDatabase();

    const result = await db.execute(`
      SELECT
        COUNT(*) as active_pools,
        SUM(CAST(total_staked AS REAL)) as total_staked
      FROM pool_states
    `);
    const stats = result.rows[0] || { active_pools: 0, total_staked: 0 };

    const summary = {
      totalTvlUsd: '0', // Would calculate from total_staked * token price
      activePools: stats.active_pools || 0,
      totalRewardsDistributed: '0', // Would sum all harvest events
    };

    res.json(summary);
  } catch (error) {
    logger.error('Error fetching farms summary', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /farms/user/:address - User's farm positions
app.get('/farms/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const db = getDatabase();

    const result = await db.execute({
      sql: `
        SELECT * FROM user_stakes
        WHERE user_address = ?
      `,
      args: [address.toLowerCase()],
    });
    const stakes = result.rows;

    const formatted = stakes.map((s) => ({
      poolId: s.pool_id,
      stakedAmount: s.staked_amount,
      pendingRewards: s.pending_rewards,
      lastUpdated: s.last_updated,
    }));

    res.json(formatted);
  } catch (error) {
    logger.error('Error fetching user farms', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Live Feed Endpoint ====================

// GET /feed/live?limit=10 - Live activity feed
app.get('/feed/live', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const feed = await queries.getRecentActivity(limit);

    const formatted = feed.map((f) => ({
      id: f.id,
      timestamp: f.timestamp,
      eventType: f.event_type,
      user: f.user_address,
      amount: f.amount,
      metadata: JSON.parse(f.metadata || '{}'),
    }));

    res.json(formatted);
  } catch (error) {
    logger.error('Error fetching live feed', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== User Dashboard Endpoints ====================

// GET /user/:address/stats - User's comprehensive stats
app.get('/user/:address/stats', async (req, res) => {
  try {
    const { address } = req.params;

    // Fetch all user stats in parallel
    const [donationStats, tradingStats, farmingStats, stakes, donationRank, tradingRank, farmingRank] = await Promise.all([
      queries.getUserDonationStats(address),
      queries.getUserTradingVolume(address),
      queries.getUserFarmingStats(address),
      queries.getUserStakes(address),
      queries.getUserDonationRank(address),
      queries.getUserTradingRank(address),
      queries.getUserFarmingRank(address),
    ]);

    // Calculate total portfolio value (staked LP tokens)
    const totalStaked = stakes.reduce((sum, stake) => sum + parseFloat(stake.staked_amount || 0), 0);
    const totalPendingRewards = stakes.reduce((sum, stake) => sum + parseFloat(stake.pending_rewards || 0), 0);

    res.json({
      address,
      donations: {
        totalBnb: donationStats.total_bnb?.toString() || '0',
        totalUsd: donationStats.total_usd?.toString() || '0',
        count: donationStats.donation_count || 0,
        rank: donationRank,
        firstDonation: donationStats.first_donation,
        lastDonation: donationStats.last_donation,
      },
      trading: {
        totalVolumeBnb: tradingStats.total_volume_bnb?.toString() || '0',
        swapCount: tradingStats.swap_count || 0,
        rank: tradingRank,
        firstSwap: tradingStats.first_swap,
        lastSwap: tradingStats.last_swap,
      },
      farming: {
        totalDeposited: farmingStats.total_deposited?.toString() || '0',
        totalWithdrawn: farmingStats.total_withdrawn?.toString() || '0',
        totalHarvested: farmingStats.total_harvested?.toString() || '0',
        poolsParticipated: farmingStats.pools_participated || 0,
        totalTransactions: farmingStats.total_transactions || 0,
        rank: farmingRank,
        currentStaked: totalStaked.toString(),
        pendingRewards: totalPendingRewards.toString(),
        activePositions: stakes.length,
      },
      positions: stakes.map((s) => ({
        poolId: s.pool_id,
        stakedAmount: s.staked_amount,
        pendingRewards: s.pending_rewards,
        lastUpdated: s.last_updated,
      })),
    });
  } catch (error) {
    logger.error('Error fetching user stats', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /user/:address/history?limit=20 - User's activity history
app.get('/user/:address/history', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const history = await queries.getUserHistory(address, limit);

    const formatted = history.map((h) => ({
      type: h.type,
      txHash: h.tx_hash,
      timestamp: h.timestamp,
      amount: h.amount,
      amountUsd: h.amount_usd,
      poolId: h.pool_id,
    }));

    res.json(formatted);
  } catch (error) {
    logger.error('Error fetching user history', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Leaderboard Endpoints ====================
// Note: Donors leaderboard uses existing /charity/top endpoint

// GET /leaderboard/traders?limit=10&hours=24 - Top traders leaderboard
app.get('/leaderboard/traders', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const hours = req.query.hours ? parseInt(req.query.hours) : null;

    const traders = await queries.getTopTraders(limit, hours);

    const formatted = traders.map((t, index) => ({
      rank: index + 1,
      address: t.address,
      totalVolumeBnb: t.total_volume_bnb?.toString() || '0',
      swapCount: t.swap_count || 0,
      firstSwap: t.first_swap,
      lastSwap: t.last_swap,
    }));

    res.json(formatted);
  } catch (error) {
    logger.error('Error fetching traders leaderboard', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /leaderboard/farmers?limit=10 - Top farmers leaderboard
app.get('/leaderboard/farmers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const farmers = await queries.getTopFarmers(limit);

    const formatted = farmers.map((f, index) => ({
      rank: index + 1,
      address: f.address,
      totalStaked: f.total_staked?.toString() || '0',
      totalPendingRewards: f.total_pending_rewards?.toString() || '0',
      activePools: f.active_pools || 0,
      lastActivity: f.last_activity,
    }));

    res.json(formatted);
  } catch (error) {
    logger.error('Error fetching farmers leaderboard', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Error Handler ====================

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== Start Server ====================

export async function startAPI() {
  // Initialize autoswap service after database is ready
  await initAutoswapService();

  return new Promise((resolve) => {
    const server = app.listen(config.port, () => {
      logger.info(`API server listening on port ${config.port}`);
      resolve(server);
    });
  });
}

export default app;
