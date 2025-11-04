# 🚀 Panboo Deployment Guide

Complete guide to deploy Panboo backend and frontend to Render.

## Prerequisites

- ✅ GitHub repository (already set up: `bidanzhu/panboo-frontend`)
- ✅ Render account (free tier available)
- ✅ Turso account for database (free tier available)
- ✅ Deployed smart contracts on BSC Mainnet

## 📋 Pre-Deployment Checklist

### 1. Set Up Turso Database

```bash
# Install Turso CLI
npm install -g @turso/cli

# Login
turso auth login

# Create database
turso db create panboo-db

# Get database URL
turso db show panboo-db
# Output: libsql://panboo-db-[your-org].turso.io

# Create auth token
turso db tokens create panboo-db
# Output: eyJhbGc... (save this token)
```

### 2. Verify Contract Addresses

Make sure you have these addresses from your BSC Mainnet deployment:
- `TOKEN_ADDRESS` - Your PANBOO token contract
- `MASTERCHEF_ADDRESS` - Your MasterChef/Farms contract
- `PANBOO_BNB_PAIR` - Your PancakeSwap LP pair address
- `CHARITY_WALLET` - Charity wallet address

## 🎯 Deployment Steps

### Option 1: Deploy via Render Dashboard (Recommended)

#### Step 1: Connect Repository

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Connect GitHub account
4. Select repository: `bidanzhu/panboo-frontend`
5. Render detects `render.yaml` automatically

#### Step 2: Configure Environment Variables

Render will create two services:
- **panboo-api** (Backend)
- **panboo-frontend** (Frontend)

For **panboo-api**, set these environment variables:

```bash
# Blockchain Configuration (BSC Mainnet)
RPC_URL=https://bsc-dataseed.binance.org
CHAIN_ID=56

# Contract Addresses (BSC Mainnet - REPLACE WITH YOUR ADDRESSES)
TOKEN_ADDRESS=0xYourTokenAddress
MASTERCHEF_ADDRESS=0xYourMasterChefAddress
CHARITY_WALLET=0xb008d3c90e2f6dd63d4a0bd3ad6f6389f333cd1d
PANBOO_BNB_PAIR=0xYourPairAddress

# Turso Database (from Step 1)
TURSO_URL=libsql://panboo-db-[your-org].turso.io
TURSO_AUTH_TOKEN=eyJhbGc...

# Server Configuration
PORT=10000
CORS_ORIGIN=*

# Blockchain Listener
POLL_INTERVAL=12000
START_BLOCK=0

# Autoswap Configuration
SWAP_AT_AMOUNT=1000
AUTOSWAP_CHECK_INTERVAL=60000

# Logging
LOG_LEVEL=info
```

For **panboo-frontend**, these are auto-configured in `render.yaml`:
- `VITE_API_URL` - Auto-linked to backend URL
- Contract addresses should match backend
- `VITE_WALLETCONNECT_ID` - Replace with your WalletConnect Project ID
- `VITE_ENABLE_FAKE_DATA=false` - Use real API data

#### Step 3: Deploy

1. Click **"Apply"** to start deployment
2. Wait for services to build (5-10 minutes)
3. Backend will be at: `https://panboo-api.onrender.com`
4. Frontend will be at: `https://panboo-frontend.onrender.com`

### Option 2: Deploy via Render CLI

```bash
# Install Render CLI
npm install -g @renderinc/cli

# Login
render login

# Deploy
render blueprint launch
```

## 🔍 Post-Deployment Verification

### 1. Check Backend Health

```bash
# Test API endpoints
curl https://panboo-api.onrender.com/health
curl https://panboo-api.onrender.com/token/price
curl https://panboo-api.onrender.com/charity/summary
```

Expected responses:
- `/health` → `{"status":"ok"}`
- `/token/price` → Price data object
- `/charity/summary` → Charity stats object

### 2. Check Frontend

1. Visit `https://panboo-frontend.onrender.com`
2. Verify pages load:
   - Home page with stats
   - Charity page with donations
   - Farms page with pools
   - Leaderboard with rankings
3. Connect wallet and test functionality

### 3. Monitor Logs

In Render Dashboard:
- Go to **panboo-api** service
- Click **"Logs"** tab
- Look for:
  ```
  [INFO] Database initialized successfully
  [INFO] API server listening on port 10000
  [INFO] Starting blockchain listener...
  [INFO] Listener started successfully
  ```

## 🐛 Troubleshooting

### Backend Issues

**Database Connection Failed**
```
Error: SQLITE_ERROR: no such column
```
Solution: Database needs migration. Delete Turso DB and recreate:
```bash
turso db destroy panboo-db
turso db create panboo-db
```

**RPC Rate Limiting**
```
Error: rate limit exceeded
```
Solution: Use a premium RPC provider:
- Chainstack: https://chainstack.com
- Alchemy: https://www.alchemy.com/bsc
- QuickNode: https://www.quicknode.com

**Service Crashes**
Check logs for:
- Missing environment variables
- Invalid contract addresses
- Network connectivity issues

### Frontend Issues

**Failed to Fetch**
- Check `VITE_API_URL` points to correct backend URL
- Verify CORS settings in backend
- Check backend is running and healthy

**Wallet Connection Issues**
- Verify `VITE_WALLETCONNECT_ID` is set
- Check contract addresses match deployed contracts
- Ensure using correct chain ID (56 for BSC Mainnet)

## 📊 Monitoring

### Render Dashboard
- View logs in real-time
- Monitor CPU/Memory usage
- Check deployment history

### API Endpoints for Monitoring
```bash
GET /health           # Service health
GET /status           # Full system status
GET /listener/status  # Blockchain listener status
```

### Database Monitoring
```bash
# Check database size
turso db inspect panboo-db

# View database stats
turso db shell panboo-db
```

## 🔄 Updates and Redeployment

### Automatic Deployments (Recommended)
1. Push changes to GitHub main branch
2. Render auto-deploys on new commits
3. Zero-downtime deployment

### Manual Redeployment
1. Go to Render Dashboard
2. Select service (panboo-api or panboo-frontend)
3. Click **"Manual Deploy"** → **"Deploy latest commit"**

### Environment Variable Updates
1. Go to service in Render Dashboard
2. Click **"Environment"** tab
3. Update variables
4. Click **"Save Changes"**
5. Service will automatically restart

## 💰 Cost Estimates

### Free Tier Limits (Render)
- **Web Services**: 750 hours/month per service
- **Static Sites**: Unlimited
- **Bandwidth**: 100 GB/month
- **Build Minutes**: 500 minutes/month

### Turso Free Tier
- **Storage**: 9 GB
- **Rows Read**: 1 billion/month
- **Rows Written**: 25 million/month
- **Databases**: 3 total

### Upgrade Considerations
Consider upgrading when:
- API receives >50 requests/second
- Database size exceeds 5 GB
- Need 99.9% uptime SLA
- Require custom domains with SSL

## 🔐 Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use Render's secret management
   - Rotate Turso tokens periodically

2. **CORS Configuration**
   - In production, set specific origins
   - Update `CORS_ORIGIN` to your domain
   - Example: `CORS_ORIGIN=https://panboo.io`

3. **Rate Limiting**
   - Consider adding rate limiting middleware
   - Use Cloudflare for DDoS protection
   - Monitor API usage patterns

4. **Database Backups**
   ```bash
   # Create manual backup
   turso db dump panboo-db > backup.sql

   # Restore from backup
   turso db shell panboo-db < backup.sql
   ```

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Turso Docs**: https://docs.turso.tech
- **GitHub Issues**: https://github.com/bidanzhu/panboo-frontend/issues

## ✅ Deployment Complete!

Your Panboo platform should now be live:
- 🔗 Backend API: `https://panboo-api.onrender.com`
- 🌐 Frontend: `https://panboo-frontend.onrender.com`

Next steps:
1. Test all functionality
2. Monitor logs for errors
3. Set up custom domain (optional)
4. Configure analytics (optional)
5. Share with community! 🎉
