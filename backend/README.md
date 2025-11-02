# Panboo Backend Service

Blockchain event listener and REST API for the Panboo DeFi platform.

## Overview

This backend service provides:

1. **Blockchain Listener** - Polls BSC blockchain for Panboo events every 12 seconds
2. **Turso Database** - Cloud SQLite for persistent data storage (free tier)
3. **REST API** - Serves aggregated data to the frontend

## Features

- Real-time event tracking (transfers, donations, farm operations)
- Price calculations (PANBOO/BNB/USD via PancakeSwap)
- Historical data aggregation
- Live activity feed
- Charity donation tracking
- Farm statistics and TVL

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│             │ Events  │              │  Data   │             │
│ BSC Network │────────▶│   Listener   │────────▶│   SQLite    │
│             │         │              │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
                                                         │
                                                         │ Query
                                                         ▼
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│             │  HTTP   │              │  Read   │             │
│  Frontend   │◀───────│   REST API   │◀────────│   SQLite    │
│             │         │              │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
```

## Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your contract addresses
```

**Database Setup:** See [TURSO_SETUP.md](TURSO_SETUP.md) for detailed Turso configuration (free cloud SQLite).

## Configuration

Edit `.env` file:

```env
# Blockchain
RPC_URL=https://bsc-dataseed.binance.org
CHAIN_ID=56

# Contract Addresses (update after deployment!)
TOKEN_ADDRESS=0xYourPanbooTokenAddress
MASTERCHEF_ADDRESS=0xYourMasterChefAddress
CHARITY_WALLET=0xYourCharityWalletAddress
PANBOO_BNB_PAIR=0xYourPancakeSwapPairAddress

# Database (Turso - see TURSO_SETUP.md)
# For local: file:panboo.db
# For production: libsql://your-database.turso.io
TURSO_URL=file:panboo.db
TURSO_AUTH_TOKEN=

# API Server
PORT=3001
CORS_ORIGIN=*

# Listener
POLL_INTERVAL=12000  # 12 seconds
START_BLOCK=0        # 0 = start from latest block

# Logging
LOG_LEVEL=info       # error, warn, info, debug
```

## Usage

### Start Full Service (Listener + API)

```bash
npm start
```

This starts both the blockchain listener and REST API server.

### Development Mode (Auto-restart)

```bash
npm run dev
```

### Run Components Separately

```bash
# API only
npm run api

# Listener only
npm run listener
```

## API Endpoints

### Token

- `GET /token/price` - Current PANBOO price
  ```json
  {
    "panbooPerBnb": "0.000001",
    "bnbPerUsd": "320.50",
    "panbooPerUsd": "0.00032",
    "updatedAt": 1234567890
  }
  ```

### Charity

- `GET /charity/summary` - Total charity summary
  ```json
  {
    "totalDonatedBnb": "12.5",
    "totalDonatedUsd": "4006.25",
    "txCount": 42,
    "walletBalanceBnb": "0.75",
    "updatedAt": 1234567890
  }
  ```

- `GET /charity/recent?limit=10` - Recent donations
- `GET /charity/top?limit=10` - Top donors
- `GET /charity/daily?days=30` - Daily donation stats

### Farms

- `GET /farms/pools` - All farm pools with stats
- `GET /farms/summary` - Farms summary (TVL, active pools)
- `GET /farms/user/:address` - User's farm positions

### Live Feed

- `GET /feed/live?limit=10` - Live activity feed
  ```json
  [
    {
      "id": 1,
      "timestamp": 1234567890,
      "eventType": "donation",
      "user": "0x...",
      "amount": "100.50",
      "metadata": { "txHash": "0x..." }
    }
  ]
  ```

### Health

- `GET /health` - Service health check

## Database Schema

### Tables

- `token_transfers` - All PANBOO token transfers
- `charity_contributions` - Donations to charity wallet
- `farm_events` - Deposit, withdraw, harvest events
- `user_stakes` - Current user positions per pool
- `pool_states` - Current farm pool states
- `live_feed` - Recent activity feed
- `daily_summaries` - Daily aggregated stats
- `sync_state` - Last processed block

## Deployment

### Local Development

1. Deploy smart contracts to testnet
2. Update `.env` with contract addresses
3. Run `npm start`
4. Frontend should connect to `http://localhost:3001`

### Production (Render.com)

1. Create new Web Service on Render
2. Connect to your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables from `.env`
6. Deploy!

Your API will be available at `https://your-app.onrender.com`

### Production (VPS/Cloud)

```bash
# Install Node.js 18+
# Clone repository
git clone <your-repo>
cd backend

# Install dependencies
npm install

# Create .env file
nano .env  # Add your configuration

# Install PM2 for process management
npm install -g pm2

# Start service
pm2 start src/index.js --name panboo-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

## Monitoring

### Logs

```bash
# View logs
tail -f logs/app.log  # If file logging is configured

# With PM2
pm2 logs panboo-backend
```

### Database

```bash
# Check database size
ls -lh panboo.db

# Query database
sqlite3 panboo.db "SELECT COUNT(*) FROM token_transfers;"
```

## Performance Tuning

### Poll Interval

- **12 seconds** (default) - Good balance for mainnet
- **5 seconds** - More responsive, higher RPC usage
- **30 seconds** - Lower RPC usage, less responsive

### Block Range

The listener processes max 100 blocks per poll. Adjust in `listener.js` if needed.

### Database Optimization

- WAL mode enabled by default for better concurrency
- Indexes on frequently queried columns
- Periodic VACUUM recommended for production

```bash
sqlite3 panboo.db "VACUUM;"
```

## Troubleshooting

### "Configuration warnings" on start

- Contract addresses not set in `.env`
- API will run but serve empty data
- Update `.env` after deploying contracts

### RPC errors

- BSC public RPC can be rate-limited
- Consider using paid RPC: Ankr, QuickNode, Infura
- Update `RPC_URL` in `.env`

### Database locked

- Multiple processes accessing database
- Use WAL mode (enabled by default)
- Check no other sqlite3 processes running

## Development

### Adding New Endpoints

1. Add route in `src/api.js`
2. Add database query in `src/db.js` queries object
3. Test endpoint

### Adding New Events

1. Add event to contract ABI in `src/listener.js`
2. Add event handler function
3. Update `processNewBlocks()` to fetch event
4. Add database storage

## License

MIT

## Support

For issues or questions, check the main repository README.
