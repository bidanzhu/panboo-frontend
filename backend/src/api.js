import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { getDatabase, queries } from './db.js';
import { getCachedPrices } from './services/priceService.js';
import { logger } from './utils/logger.js';

const app = express();

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

// ==================== Charity Endpoints ====================

// GET /charity/summary - Total charity summary
app.get('/charity/summary', async (req, res) => {
  try {
    const stats = await queries.getCharityStats();

    // Get charity wallet balance (you could also fetch this from blockchain)
    const summary = {
      totalDonatedBnb: stats.total_bnb?.toString() || '0',
      totalDonatedUsd: stats.total_usd?.toString() || '0',
      txCount: stats.tx_count || 0,
      walletBalanceBnb: '0', // TODO: Fetch from blockchain if needed
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

// GET /charity/top?limit=10 - Top donors
app.get('/charity/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const donors = await queries.getTopDonors(limit);

    const formatted = donors.map((d) => ({
      address: d.from_address,
      totalBnb: d.total_bnb?.toString() || '0',
      totalUsd: d.total_usd?.toString() || '0',
      txCount: d.tx_count || 0,
    }));

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

// ==================== Error Handler ====================

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== Start Server ====================

export function startAPI() {
  return new Promise((resolve) => {
    const server = app.listen(config.port, () => {
      logger.info(`API server listening on port ${config.port}`);
      resolve(server);
    });
  });
}

export default app;
