import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const db = createClient({
  url: process.env.TURSO_URL || 'file:panboo.db',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

async function insertTestData() {
  console.log('Inserting test data...');

  try {
    // Insert test charity donation
    await db.execute({
      sql: `INSERT INTO charity_contributions (tx_hash, block_number, timestamp, from_address, amount_bnb, amount_usd)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        12345678,
        Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        '0xb008e4eE98fF8991fDc079537157eF7ACF2FE614',
        '0.5',
        '160.25',
      ],
    });

    await db.execute({
      sql: `INSERT INTO charity_contributions (tx_hash, block_number, timestamp, from_address, amount_bnb, amount_usd)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        12345679,
        Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        '1.2',
        '384.60',
      ],
    });

    // Insert test live feed items
    await db.execute({
      sql: `INSERT INTO live_feed (timestamp, event_type, user_address, amount, metadata)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        Math.floor(Date.now() / 1000) - 1800,
        'donation',
        '0xb008e4eE98fF8991fDc079537157eF7ACF2FE614',
        '160.25',
        JSON.stringify({ txHash: '0x1234...' }),
      ],
    });

    await db.execute({
      sql: `INSERT INTO live_feed (timestamp, event_type, user_address, amount, metadata)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        Math.floor(Date.now() / 1000) - 900,
        'farm_deposit',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        '1000000000000000000',
        JSON.stringify({ poolId: 0, txHash: '0xabcd...' }),
      ],
    });

    console.log('✅ Test data inserted successfully!');
    console.log('\nTry these endpoints:');
    console.log('  curl http://localhost:3002/charity/summary');
    console.log('  curl http://localhost:3002/charity/recent');
    console.log('  curl http://localhost:3002/feed/live');

  } catch (error) {
    console.error('Error inserting test data:', error);
  }
}

insertTestData();
