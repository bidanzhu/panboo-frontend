import { createClient } from '@libsql/client';
import { config } from './config.js';
import { logger } from './utils/logger.js';

let db = null;

export async function initDatabase() {
  logger.info('Initializing database', { url: config.tursoUrl });

  db = createClient({
    url: config.tursoUrl,
    authToken: config.tursoAuthToken,
  });

  // Create tables
  await createTables();

  logger.info('Database initialized successfully');
  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

async function createTables() {
  // Token transfers - with migration for log_index column
  await db.execute(`
    CREATE TABLE IF NOT EXISTS token_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL DEFAULT 0,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      amount TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Migrate existing table: add log_index if missing
  try {
    const result = await db.execute(`PRAGMA table_info(token_transfers)`);
    const columns = result.rows.map(row => row.name);
    if (columns.length > 0 && !columns.includes('log_index')) {
      logger.info('Adding log_index column to token_transfers table');
      await db.execute(`ALTER TABLE token_transfers ADD COLUMN log_index INTEGER NOT NULL DEFAULT 0`);
    }
  } catch (error) {
    logger.error('Error migrating token_transfers table', { error: error.message });
  }

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_transfers_block ON token_transfers(block_number)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_transfers_timestamp ON token_transfers(timestamp)`);

  // Migrate existing index: drop old, create new with log_index
  await db.execute(`DROP INDEX IF EXISTS ux_transfers_tx`);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS ux_transfers_tx_log ON token_transfers(tx_hash, log_index)`);

  // Charity contributions - migration: drop old table if schema mismatch
  try {
    // Check if table exists and has correct schema
    const result = await db.execute(`PRAGMA table_info(charity_contributions)`);
    const columns = result.rows.map(row => row.name);

    if (columns.length > 0 && !columns.includes('contribution_type')) {
      // Old schema detected, drop and recreate
      logger.info('Migrating charity_contributions table to new schema');
      await db.execute(`DROP TABLE IF EXISTS charity_contributions`);
      await db.execute(`DROP INDEX IF EXISTS idx_charity_block`);
      await db.execute(`DROP INDEX IF EXISTS idx_charity_timestamp`);
      await db.execute(`DROP INDEX IF EXISTS ux_charity_tx`);
      await db.execute(`DROP INDEX IF EXISTS ux_charity_tx_type`);
    }
  } catch (error) {
    // Table doesn't exist yet, continue
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS charity_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL DEFAULT 0,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      from_address TEXT NOT NULL,
      contribution_type TEXT NOT NULL DEFAULT 'delivered',
      amount_bnb TEXT NOT NULL,
      amount_panboo TEXT,
      amount_usd TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_charity_block ON charity_contributions(block_number)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_charity_timestamp ON charity_contributions(timestamp)`);

  // Migrate existing index: drop old, create new with log_index
  await db.execute(`DROP INDEX IF EXISTS ux_charity_tx_type`);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS ux_charity_tx_type_log ON charity_contributions(tx_hash, contribution_type, log_index)`);

  // Farm events (deposit, withdraw, harvest) - with migration for log_index column
  await db.execute(`
    CREATE TABLE IF NOT EXISTS farm_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL DEFAULT 0,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      user_address TEXT NOT NULL,
      pool_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      amount TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Migrate existing table: add log_index if missing
  try {
    const result = await db.execute(`PRAGMA table_info(farm_events)`);
    const columns = result.rows.map(row => row.name);
    if (columns.length > 0 && !columns.includes('log_index')) {
      logger.info('Adding log_index column to farm_events table');
      await db.execute(`ALTER TABLE farm_events ADD COLUMN log_index INTEGER NOT NULL DEFAULT 0`);
    }
  } catch (error) {
    logger.error('Error migrating farm_events table', { error: error.message });
  }

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_farm_events_user ON farm_events(user_address)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_farm_events_pool ON farm_events(pool_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_farm_events_timestamp ON farm_events(timestamp)`);

  // Migrate existing index: drop old, create new with log_index
  await db.execute(`DROP INDEX IF EXISTS ux_farm_tx`);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS ux_farm_tx_log ON farm_events(tx_hash, user_address, pool_id, event_type, log_index)`);

  // User stakes (current state per pool)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_stakes (
      user_address TEXT NOT NULL,
      pool_id INTEGER NOT NULL,
      staked_amount TEXT NOT NULL DEFAULT '0',
      pending_rewards TEXT NOT NULL DEFAULT '0',
      last_updated INTEGER NOT NULL,
      PRIMARY KEY (user_address, pool_id)
    )
  `);

  // Pool states (current state)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS pool_states (
      pool_id INTEGER PRIMARY KEY,
      lp_token TEXT NOT NULL,
      alloc_point INTEGER NOT NULL,
      total_staked TEXT NOT NULL DEFAULT '0',
      reward_per_block TEXT NOT NULL,
      last_reward_block INTEGER NOT NULL,
      last_updated INTEGER NOT NULL
    )
  `);

  // Live feed (aggregated recent activity)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS live_feed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      user_address TEXT,
      amount TEXT,
      metadata TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_feed_timestamp ON live_feed(timestamp DESC)`);

  // Daily summaries (aggregated stats)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS daily_summaries (
      date TEXT PRIMARY KEY,
      total_volume TEXT NOT NULL DEFAULT '0',
      total_donations_bnb TEXT NOT NULL DEFAULT '0',
      total_donations_usd TEXT NOT NULL DEFAULT '0',
      unique_users INTEGER NOT NULL DEFAULT 0,
      tx_count INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Sync state (track last processed block)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_block INTEGER NOT NULL,
      last_updated INTEGER NOT NULL
    )
  `);

  // System settings
  await db.execute(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Initialize default autoswap setting (disabled by default)
  try {
    const result = await db.execute({
      sql: 'SELECT value FROM system_settings WHERE key = ?',
      args: ['autoswap_enabled'],
    });

    if (result.rows.length === 0) {
      // Insert default value: disabled
      await db.execute({
        sql: 'INSERT INTO system_settings (key, value) VALUES (?, ?)',
        args: ['autoswap_enabled', 'false'],
      });
      logger.info('Autoswap setting initialized: disabled by default');
    }
  } catch (error) {
    logger.error('Error initializing autoswap setting', { error: error.message });
  }

  // Price history (for autoswap strategy)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      price_bnb TEXT NOT NULL,
      reserve_panboo TEXT NOT NULL,
      reserve_bnb TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_price_timestamp ON price_history(timestamp DESC)`);

  // Swap events (for volume tracking) - with migration for log_index column
  await db.execute(`
    CREATE TABLE IF NOT EXISTS swap_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL DEFAULT 0,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      sender TEXT NOT NULL,
      amount0_in TEXT NOT NULL,
      amount1_in TEXT NOT NULL,
      amount0_out TEXT NOT NULL,
      amount1_out TEXT NOT NULL,
      to_address TEXT NOT NULL,
      volume_bnb TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Migrate existing table: add log_index if missing
  try {
    const result = await db.execute(`PRAGMA table_info(swap_events)`);
    const columns = result.rows.map(row => row.name);
    if (columns.length > 0 && !columns.includes('log_index')) {
      logger.info('Adding log_index column to swap_events table');
      await db.execute(`ALTER TABLE swap_events ADD COLUMN log_index INTEGER NOT NULL DEFAULT 0`);
    }
  } catch (error) {
    logger.error('Error migrating swap_events table', { error: error.message });
  }

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_swap_timestamp ON swap_events(timestamp DESC)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_swap_block ON swap_events(block_number)`);

  // Migrate existing index: drop old, create new with log_index
  await db.execute(`DROP INDEX IF EXISTS ux_swap_tx`);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS ux_swap_tx_log ON swap_events(tx_hash, log_index)`);

  logger.info('Database tables created');
}

// Helper functions (now async)
export const queries = {
  // Sync state
  getLastBlock: async () => {
    try {
      const result = await db.execute('SELECT last_block FROM sync_state WHERE id = 1');
      return result.rows.length > 0 ? result.rows[0].last_block : null;
    } catch (error) {
      logger.error('Database error in getLastBlock', { error: error.message });
      return null;
    }
  },

  setLastBlock: async (blockNumber) => {
    try {
      await db.execute({
        sql: `
          INSERT INTO sync_state (id, last_block, last_updated)
          VALUES (1, ?, strftime('%s', 'now'))
          ON CONFLICT(id) DO UPDATE SET
            last_block = excluded.last_block,
            last_updated = excluded.last_updated
        `,
        args: [blockNumber],
      });
    } catch (error) {
      logger.error('Database error in setLastBlock', { error: error.message, blockNumber });
      throw error; // Re-throw as this is critical
    }
  },

  // Token transfers
  insertTransfer: async (transfer) => {
    try {
      await db.execute({
        sql: `
          INSERT OR IGNORE INTO token_transfers (tx_hash, log_index, block_number, timestamp, from_address, to_address, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          transfer.txHash,
          transfer.logIndex || 0,
          transfer.blockNumber,
          transfer.timestamp,
          transfer.from,
          transfer.to,
          transfer.amount,
        ],
      });
    } catch (error) {
      logger.error('Database error in insertTransfer', {
        error: error.message,
        txHash: transfer.txHash,
        logIndex: transfer.logIndex,
      });
      throw error; // Re-throw to trigger failure tracking
    }
  },

  // Charity contributions
  insertCharity: async (charity) => {
    try {
      await db.execute({
        sql: `
          INSERT OR IGNORE INTO charity_contributions (tx_hash, log_index, block_number, timestamp, from_address, contribution_type, amount_bnb, amount_panboo, amount_usd)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          charity.txHash,
          charity.logIndex || 0,
          charity.blockNumber,
          charity.timestamp,
          charity.from,
          charity.contributionType || 'delivered',
          charity.amountBnb || '0',
          charity.amountPanboo || null,
          charity.amountUsd || null,
        ],
      });
    } catch (error) {
      logger.error('Database error in insertCharity', {
        error: error.message,
        txHash: charity.txHash,
        logIndex: charity.logIndex,
        contributionType: charity.contributionType,
      });
      throw error; // Re-throw to trigger failure tracking
    }
  },

  // Farm events
  insertFarmEvent: async (event) => {
    try {
      await db.execute({
        sql: `
          INSERT OR IGNORE INTO farm_events (tx_hash, log_index, block_number, timestamp, user_address, pool_id, event_type, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          event.txHash,
          event.logIndex || 0,
          event.blockNumber,
          event.timestamp,
          event.user,
          event.poolId,
          event.eventType,
          event.amount,
        ],
      });
    } catch (error) {
      logger.error('Database error in insertFarmEvent', {
        error: error.message,
        txHash: event.txHash,
        logIndex: event.logIndex,
        eventType: event.eventType,
      });
      throw error; // Re-throw to trigger failure tracking
    }
  },

  // Live feed
  insertFeed: async (feed) => {
    try {
      await db.execute({
        sql: `
          INSERT INTO live_feed (timestamp, event_type, user_address, amount, metadata)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [
          feed.timestamp,
          feed.eventType,
          feed.user || null,
          feed.amount || null,
          JSON.stringify(feed.metadata || {}),
        ],
      });
    } catch (error) {
      logger.error('Database error in insertFeed', {
        error: error.message,
        eventType: feed.eventType,
      });
      // Don't re-throw - feed is non-critical
    }
  },

  // Get recent activity
  getRecentActivity: async (limit = 10) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT * FROM live_feed
          ORDER BY timestamp DESC
          LIMIT ?
        `,
        args: [limit],
      });
      return result.rows;
    } catch (error) {
      logger.error('Database error in getRecentActivity', { error: error.message });
      return [];
    }
  },

  // Charity stats (only delivered donations - actual BNB sent to charity)
  getCharityStats: async () => {
    try {
      const result = await db.execute(`
        SELECT
          SUM(CAST(amount_bnb AS REAL)) as total_bnb,
          SUM(CAST(amount_usd AS REAL)) as total_usd,
          COUNT(*) as tx_count
        FROM charity_contributions
        WHERE contribution_type = 'delivered'
      `);
      return result.rows[0] || { total_bnb: 0, total_usd: 0, tx_count: 0 };
    } catch (error) {
      logger.error('Database error in getCharityStats', { error: error.message });
      return { total_bnb: 0, total_usd: 0, tx_count: 0 };
    }
  },

  // Daily donations (only delivered - actual BNB sent)
  getDailyDonations: async (days = 30) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT
            date(timestamp, 'unixepoch') as date,
            SUM(CAST(amount_bnb AS REAL)) as total_bnb,
            SUM(CAST(amount_usd AS REAL)) as total_usd,
            COUNT(*) as tx_count
          FROM charity_contributions
          WHERE contribution_type = 'delivered'
            AND timestamp > strftime('%s', 'now', '-' || ? || ' days')
          GROUP BY date(timestamp, 'unixepoch')
          ORDER BY date DESC
        `,
        args: [days],
      });
      return result.rows;
    } catch (error) {
      logger.error('Database error in getDailyDonations', { error: error.message, days });
      return [];
    }
  },

  // Recent donations (only delivered - actual BNB sent)
  getRecentDonations: async (limit = 10) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT * FROM charity_contributions
          WHERE contribution_type = 'delivered'
          ORDER BY timestamp DESC
          LIMIT ?
        `,
        args: [limit],
      });
      return result.rows;
    } catch (error) {
      logger.error('Database error in getRecentDonations', { error: error.message });
      return [];
    }
  },

  // Top donors (by pledged PANBOO tax contributions)
  getTopDonors: async (limit = 10) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT
            from_address,
            SUM(CAST(amount_panboo AS REAL)) as total_panboo,
            COUNT(*) as tx_count
          FROM charity_contributions
          WHERE contribution_type = 'pledged'
          GROUP BY from_address
          ORDER BY total_panboo DESC
          LIMIT ?
        `,
        args: [limit],
      });
      return result.rows;
    } catch (error) {
      logger.error('Database error in getTopDonors', { error: error.message });
      return [];
    }
  },

  // Top donors raw (returns all pledges for precision summing in Node)
  getTopDonorsRaw: async () => {
    try {
      const result = await db.execute(`
        SELECT from_address, amount_panboo
        FROM charity_contributions
        WHERE contribution_type = 'pledged'
      `);
      return result.rows;
    } catch (error) {
      logger.error('Database error in getTopDonorsRaw', { error: error.message });
      return [];
    }
  },

  // Price history
  insertPrice: async (price) => {
    try {
      await db.execute({
        sql: `
          INSERT INTO price_history (timestamp, price_bnb, reserve_panboo, reserve_bnb)
          VALUES (?, ?, ?, ?)
        `,
        args: [
          price.timestamp,
          price.priceBnb,
          price.reservePanboo,
          price.reserveBnb,
        ],
      });
    } catch (error) {
      logger.error('Database error in insertPrice', {
        error: error.message,
        timestamp: price.timestamp,
      });
      // Don't re-throw - price updates are non-critical
    }
  },

  // Get recent prices (for loading into memory on startup)
  getRecentPrices: async (limit = 60) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT timestamp, price_bnb, reserve_panboo, reserve_bnb
          FROM price_history
          ORDER BY timestamp DESC
          LIMIT ?
        `,
        args: [limit],
      });
      // Return in chronological order (oldest to newest)
      return result.rows.reverse();
    } catch (error) {
      logger.error('Database error in getRecentPrices', { error: error.message });
      return [];
    }
  },

  // Get price history for charts (with time range)
  getPriceHistory: async (hours = 24) => {
    try {
      const timestampFrom = Math.floor(Date.now() / 1000) - (hours * 3600);
      const result = await db.execute({
        sql: `
          SELECT timestamp, price_bnb, reserve_panboo, reserve_bnb
          FROM price_history
          WHERE timestamp >= ?
          ORDER BY timestamp ASC
        `,
        args: [timestampFrom],
      });
      return result.rows;
    } catch (error) {
      logger.error('Database error in getPriceHistory', { error: error.message, hours });
      return [];
    }
  },

  // Get price stats
  getPriceStats: async (hours = 24) => {
    try {
      const timestampFrom = Math.floor(Date.now() / 1000) - (hours * 3600);
      const result = await db.execute({
        sql: `
          SELECT
            COUNT(*) as data_points,
            MIN(CAST(price_bnb AS REAL)) as min_price,
            MAX(CAST(price_bnb AS REAL)) as max_price,
            AVG(CAST(price_bnb AS REAL)) as avg_price,
            MIN(timestamp) as first_timestamp,
            MAX(timestamp) as last_timestamp
          FROM price_history
          WHERE timestamp >= ?
        `,
        args: [timestampFrom],
      });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Database error in getPriceStats', { error: error.message, hours });
      return null;
    }
  },

  // Swap events
  insertSwapEvent: async (swap) => {
    try {
      await db.execute({
        sql: `
          INSERT OR IGNORE INTO swap_events (
            tx_hash, log_index, block_number, timestamp, sender,
            amount0_in, amount1_in, amount0_out, amount1_out,
            to_address, volume_bnb
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          swap.txHash,
          swap.logIndex || 0,
          swap.blockNumber,
          swap.timestamp,
          swap.sender,
          swap.amount0In,
          swap.amount1In,
          swap.amount0Out,
          swap.amount1Out,
          swap.to,
          swap.volumeBnb,
        ],
      });
    } catch (error) {
      logger.error('Database error in insertSwapEvent', {
        error: error.message,
        txHash: swap.txHash,
        logIndex: swap.logIndex,
      });
      // Don't re-throw - swap tracking is non-critical
    }
  },

  // Get volume stats
  getVolumeStats: async (hours = 24) => {
    try {
      const timestampFrom = Math.floor(Date.now() / 1000) - (hours * 3600);
      const result = await db.execute({
        sql: `
          SELECT
            SUM(CAST(volume_bnb AS REAL)) as total_volume_bnb,
            COUNT(*) as swap_count,
            SUM(CASE WHEN CAST(amount0_in AS REAL) > 0 THEN 1 ELSE 0 END) as buys,
            SUM(CASE WHEN CAST(amount0_out AS REAL) > 0 THEN 1 ELSE 0 END) as sells
          FROM swap_events
          WHERE timestamp >= ?
        `,
        args: [timestampFrom],
      });
      return result.rows[0] || { total_volume_bnb: 0, swap_count: 0, buys: 0, sells: 0 };
    } catch (error) {
      logger.error('Database error in getVolumeStats', { error: error.message, hours });
      return { total_volume_bnb: 0, swap_count: 0, buys: 0, sells: 0 };
    }
  },

  // Get last processed swap block (max block_number)
  getLastSwapBlock: async () => {
    try {
      const result = await db.execute('SELECT MAX(block_number) as max_block FROM swap_events');
      return result.rows[0]?.max_block || 0;
    } catch (error) {
      logger.error('Database error in getLastSwapBlock', { error: error.message });
      return 0;
    }
  },

  // Get recent swaps
  getRecentSwaps: async (limit = 10) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT * FROM swap_events
          ORDER BY timestamp DESC
          LIMIT ?
        `,
        args: [limit],
      });
      return result.rows;
    } catch (error) {
      logger.error('Database error in getRecentSwaps', { error: error.message });
      return [];
    }
  },

  // ==================== User Stats ====================

  // Get user's donation stats (only delivered BNB donations)
  getUserDonationStats: async (address) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT
            SUM(CAST(amount_bnb AS REAL)) as total_bnb,
            SUM(CAST(amount_usd AS REAL)) as total_usd,
            COUNT(*) as donation_count,
            MIN(timestamp) as first_donation,
            MAX(timestamp) as last_donation
          FROM charity_contributions
          WHERE LOWER(from_address) = LOWER(?)
            AND contribution_type = 'delivered'
        `,
        args: [address],
      });
      return result.rows[0] || { total_bnb: 0, total_usd: 0, donation_count: 0, first_donation: null, last_donation: null };
    } catch (error) {
      logger.error('Database error in getUserDonationStats', { error: error.message, address });
      return { total_bnb: 0, total_usd: 0, donation_count: 0, first_donation: null, last_donation: null };
    }
  },

  // Get user's trading volume
  getUserTradingVolume: async (address) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT
            SUM(CAST(volume_bnb AS REAL)) as total_volume_bnb,
            COUNT(*) as swap_count,
            MIN(timestamp) as first_swap,
            MAX(timestamp) as last_swap
          FROM swap_events
          WHERE LOWER(sender) = LOWER(?)
        `,
        args: [address],
      });
      return result.rows[0] || { total_volume_bnb: 0, swap_count: 0, first_swap: null, last_swap: null };
    } catch (error) {
      logger.error('Database error in getUserTradingVolume', { error: error.message, address });
      return { total_volume_bnb: 0, swap_count: 0, first_swap: null, last_swap: null };
    }
  },

  // Get user's farming stats
  getUserFarmingStats: async (address) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT
            SUM(CASE WHEN event_type = 'deposit' THEN CAST(amount AS REAL) ELSE 0 END) as total_deposited,
            SUM(CASE WHEN event_type = 'withdraw' THEN CAST(amount AS REAL) ELSE 0 END) as total_withdrawn,
            SUM(CASE WHEN event_type = 'harvest' THEN CAST(amount AS REAL) ELSE 0 END) as total_harvested,
            COUNT(DISTINCT pool_id) as pools_participated,
            COUNT(*) as total_transactions
          FROM farm_events
          WHERE LOWER(user_address) = LOWER(?)
        `,
        args: [address],
      });
      return result.rows[0] || { total_deposited: 0, total_withdrawn: 0, total_harvested: 0, pools_participated: 0, total_transactions: 0 };
    } catch (error) {
      logger.error('Database error in getUserFarmingStats', { error: error.message, address });
      return { total_deposited: 0, total_withdrawn: 0, total_harvested: 0, pools_participated: 0, total_transactions: 0 };
    }
  },

  // Get user's current farming positions
  getUserStakes: async (address) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT * FROM user_stakes
          WHERE LOWER(user_address) = LOWER(?)
        `,
        args: [address],
      });
      return result.rows;
    } catch (error) {
      logger.error('Database error in getUserStakes', { error: error.message, address });
      return [];
    }
  },

  // Get user's recent activity history
  getUserHistory: async (address, limit = 20) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT
            'donation' as type,
            tx_hash,
            timestamp,
            amount_bnb as amount,
            amount_usd as amount_usd,
            NULL as pool_id
          FROM charity_contributions
          WHERE LOWER(from_address) = LOWER(?)

          UNION ALL

          SELECT
            'swap' as type,
            tx_hash,
            timestamp,
            volume_bnb as amount,
            NULL as amount_usd,
            NULL as pool_id
          FROM swap_events
          WHERE LOWER(sender) = LOWER(?)

          UNION ALL

          SELECT
            event_type as type,
            tx_hash,
            timestamp,
            amount,
            NULL as amount_usd,
            pool_id
          FROM farm_events
          WHERE LOWER(user_address) = LOWER(?)

          ORDER BY timestamp DESC
          LIMIT ?
        `,
        args: [address, address, address, limit],
      });
      return result.rows;
    } catch (error) {
      logger.error('Database error in getUserHistory', { error: error.message, address });
      return [];
    }
  },

  // ==================== Leaderboards ====================

  // Top traders by volume
  getTopTraders: async (limit = 10, hours = null) => {
    try {
      // Fix SQL injection: use parameterized query instead of string interpolation
      const timestampFrom = hours ? Math.floor(Date.now() / 1000) - (hours * 3600) : 0;

      const result = await db.execute({
        sql: `
          SELECT
            sender as address,
            SUM(CAST(volume_bnb AS REAL)) as total_volume_bnb,
            COUNT(*) as swap_count,
            MIN(timestamp) as first_swap,
            MAX(timestamp) as last_swap
          FROM swap_events
          ${hours ? 'WHERE timestamp >= ?' : ''}
          GROUP BY sender
          ORDER BY total_volume_bnb DESC
          LIMIT ?
        `,
        args: hours ? [timestampFrom, limit] : [limit],
      });
      return result.rows;
    } catch (error) {
      logger.error('Database error in getTopTraders', { error: error.message, hours, limit });
      return [];
    }
  },

  // Top farmers by TVL
  getTopFarmers: async (limit = 10) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT
            user_address as address,
            SUM(CAST(staked_amount AS REAL)) as total_staked,
            SUM(CAST(pending_rewards AS REAL)) as total_pending_rewards,
            COUNT(*) as active_pools,
            MAX(last_updated) as last_activity
          FROM user_stakes
          WHERE CAST(staked_amount AS REAL) > 0
          GROUP BY user_address
          ORDER BY total_staked DESC
          LIMIT ?
        `,
        args: [limit],
      });
      return result.rows;
    } catch (error) {
      logger.error('Database error in getTopFarmers', { error: error.message });
      return [];
    }
  },

  // Get user's rank in donations (only delivered BNB donations)
  getUserDonationRank: async (address) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT COUNT(*) + 1 as rank
          FROM (
            SELECT
              from_address,
              SUM(CAST(amount_usd AS REAL)) as total_usd
            FROM charity_contributions
            WHERE contribution_type = 'delivered'
            GROUP BY from_address
          ) as donors
          WHERE total_usd > (
            SELECT SUM(CAST(amount_usd AS REAL))
            FROM charity_contributions
            WHERE LOWER(from_address) = LOWER(?)
              AND contribution_type = 'delivered'
          )
        `,
        args: [address],
      });
      return result.rows[0]?.rank || null;
    } catch (error) {
      logger.error('Database error in getUserDonationRank', { error: error.message, address });
      return null;
    }
  },

  // Get user's rank in trading
  getUserTradingRank: async (address) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT COUNT(*) + 1 as rank
          FROM (
            SELECT
              sender,
              SUM(CAST(volume_bnb AS REAL)) as total_volume
            FROM swap_events
            GROUP BY sender
          ) as traders
          WHERE total_volume > (
            SELECT SUM(CAST(volume_bnb AS REAL))
            FROM swap_events
            WHERE LOWER(sender) = LOWER(?)
          )
        `,
        args: [address],
      });
      return result.rows[0]?.rank || null;
    } catch (error) {
      logger.error('Database error in getUserTradingRank', { error: error.message, address });
      return null;
    }
  },

  // Get user's rank in farming
  getUserFarmingRank: async (address) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT COUNT(*) + 1 as rank
          FROM (
            SELECT
              user_address,
              SUM(CAST(staked_amount AS REAL)) as total_staked
          FROM user_stakes
          WHERE CAST(staked_amount AS REAL) > 0
          GROUP BY user_address
        ) as farmers
        WHERE total_staked > (
          SELECT SUM(CAST(staked_amount AS REAL))
          FROM user_stakes
          WHERE LOWER(user_address) = LOWER(?)
        )
      `,
        args: [address],
      });
      return result.rows[0]?.rank || null;
    } catch (error) {
      logger.error('Database error in getUserFarmingRank', { error: error.message, address });
      return null;
    }
  },

  // System Settings
  getSetting: async (key) => {
    try {
      const result = await db.execute({
        sql: 'SELECT value FROM system_settings WHERE key = ?',
        args: [key],
      });
      return result.rows.length > 0 ? result.rows[0].value : null;
    } catch (error) {
      logger.error('Database error in getSetting', { error: error.message, key });
      return null;
    }
  },

  setSetting: async (key, value) => {
    try {
      await db.execute({
        sql: `
          INSERT INTO system_settings (key, value, updated_at)
          VALUES (?, ?, strftime('%s', 'now'))
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        `,
        args: [key, value],
      });
      logger.info('Setting updated', { key, value });
      return true;
    } catch (error) {
      logger.error('Database error in setSetting', { error: error.message, key, value });
      throw error;
    }
  },

  getAutoswapEnabled: async () => {
    try {
      const value = await queries.getSetting('autoswap_enabled');
      return value === 'true';
    } catch (error) {
      logger.error('Error getting autoswap enabled state', { error: error.message });
      return false; // Default to disabled
    }
  },

  setAutoswapEnabled: async (enabled) => {
    try {
      await queries.setSetting('autoswap_enabled', enabled ? 'true' : 'false');
      logger.info('Autoswap enabled state changed', { enabled });
      return true;
    } catch (error) {
      logger.error('Error setting autoswap enabled state', { error: error.message, enabled });
      throw error;
    }
  },
};
