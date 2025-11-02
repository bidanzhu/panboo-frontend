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
  // Token transfers
  await db.execute(`
    CREATE TABLE IF NOT EXISTS token_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      amount TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_transfers_block ON token_transfers(block_number)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_transfers_timestamp ON token_transfers(timestamp)`);

  // Charity contributions
  await db.execute(`
    CREATE TABLE IF NOT EXISTS charity_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      from_address TEXT NOT NULL,
      amount_bnb TEXT NOT NULL,
      amount_usd TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_charity_block ON charity_contributions(block_number)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_charity_timestamp ON charity_contributions(timestamp)`);

  // Farm events (deposit, withdraw, harvest)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS farm_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      user_address TEXT NOT NULL,
      pool_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      amount TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_farm_events_user ON farm_events(user_address)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_farm_events_pool ON farm_events(pool_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_farm_events_timestamp ON farm_events(timestamp)`);

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

  logger.info('Database tables created');
}

// Helper functions (now async)
export const queries = {
  // Sync state
  getLastBlock: async () => {
    const result = await db.execute('SELECT last_block FROM sync_state WHERE id = 1');
    return result.rows.length > 0 ? result.rows[0].last_block : null;
  },

  setLastBlock: async (blockNumber) => {
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
  },

  // Token transfers
  insertTransfer: async (transfer) => {
    await db.execute({
      sql: `
        INSERT INTO token_transfers (tx_hash, block_number, timestamp, from_address, to_address, amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [
        transfer.txHash,
        transfer.blockNumber,
        transfer.timestamp,
        transfer.from,
        transfer.to,
        transfer.amount,
      ],
    });
  },

  // Charity contributions
  insertCharity: async (charity) => {
    await db.execute({
      sql: `
        INSERT INTO charity_contributions (tx_hash, block_number, timestamp, from_address, amount_bnb, amount_usd)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [
        charity.txHash,
        charity.blockNumber,
        charity.timestamp,
        charity.from,
        charity.amountBnb,
        charity.amountUsd,
      ],
    });
  },

  // Farm events
  insertFarmEvent: async (event) => {
    await db.execute({
      sql: `
        INSERT INTO farm_events (tx_hash, block_number, timestamp, user_address, pool_id, event_type, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        event.txHash,
        event.blockNumber,
        event.timestamp,
        event.user,
        event.poolId,
        event.eventType,
        event.amount,
      ],
    });
  },

  // Live feed
  insertFeed: async (feed) => {
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
  },

  // Get recent activity
  getRecentActivity: async (limit = 10) => {
    const result = await db.execute({
      sql: `
        SELECT * FROM live_feed
        ORDER BY timestamp DESC
        LIMIT ?
      `,
      args: [limit],
    });
    return result.rows;
  },

  // Charity stats
  getCharityStats: async () => {
    const result = await db.execute(`
      SELECT
        SUM(CAST(amount_bnb AS REAL)) as total_bnb,
        SUM(CAST(amount_usd AS REAL)) as total_usd,
        COUNT(*) as tx_count
      FROM charity_contributions
    `);
    return result.rows[0] || { total_bnb: 0, total_usd: 0, tx_count: 0 };
  },

  // Daily donations
  getDailyDonations: async (days = 30) => {
    const result = await db.execute({
      sql: `
        SELECT
          date(timestamp, 'unixepoch') as date,
          SUM(CAST(amount_bnb AS REAL)) as total_bnb,
          SUM(CAST(amount_usd AS REAL)) as total_usd,
          COUNT(*) as tx_count
        FROM charity_contributions
        WHERE timestamp > strftime('%s', 'now', '-' || ? || ' days')
        GROUP BY date(timestamp, 'unixepoch')
        ORDER BY date DESC
      `,
      args: [days],
    });
    return result.rows;
  },

  // Recent donations
  getRecentDonations: async (limit = 10) => {
    const result = await db.execute({
      sql: `
        SELECT * FROM charity_contributions
        ORDER BY timestamp DESC
        LIMIT ?
      `,
      args: [limit],
    });
    return result.rows;
  },

  // Top donors
  getTopDonors: async (limit = 10) => {
    const result = await db.execute({
      sql: `
        SELECT
          from_address,
          SUM(CAST(amount_bnb AS REAL)) as total_bnb,
          SUM(CAST(amount_usd AS REAL)) as total_usd,
          COUNT(*) as tx_count
        FROM charity_contributions
        GROUP BY from_address
        ORDER BY total_usd DESC
        LIMIT ?
      `,
      args: [limit],
    });
    return result.rows;
  },
};
