# Panboo Full Stack Deployment Guide

Complete guide to deploy both backend API (with Turso database) and frontend to Render.com using the free tier.

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│                 │  HTTPS  │                  │  libsql │             │
│  Render Static  │────────▶│   Render Web     │────────▶│   Turso DB  │
│  (Frontend)     │         │   (Backend API)  │         │  (Cloud)    │
│                 │         │                  │         │             │
└─────────────────┘         └──────────────────┘         └─────────────┘
      React                    Node.js + Express             SQLite
      Vite                     Blockchain Listener           Free Tier
```

## Prerequisites Checklist

- [ ] GitHub account
- [ ] Render.com account (free tier)
- [ ] Turso account (free tier)
- [ ] Code pushed to GitHub repository
- [ ] WalletConnect Project ID (optional, for wallet integration)

---

## Part 1: Set Up Turso Database (5 minutes)

### Step 1.1: Create Turso Account

1. Go to https://turso.tech
2. Click "Sign Up" and sign in with GitHub
3. Complete registration (free tier)

### Step 1.2: Install Turso CLI

**Windows:**
```powershell
# Using Scoop (recommended)
scoop install turso

# Or using Chocolatey
choco install turso
```

**Mac/Linux:**
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### Step 1.3: Login to Turso

```bash
turso auth login
```

This opens your browser to authenticate.

### Step 1.4: Create Database

```bash
# Create database
turso db create panboo-db

# Get the database URL (save this!)
turso db show panboo-db --url
# Output example: libsql://panboo-db-yourname.turso.io
```

**Copy the URL** - you'll need it for Render environment variables.

### Step 1.5: Create Auth Token

```bash
# Create authentication token
turso db tokens create panboo-db

# Output example: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

**IMPORTANT**: Copy this token immediately! You can't view it again.

### Step 1.6: Test Database (Optional)

```bash
# Access database shell
turso db shell panboo-db

# You should see:
# Connected to panboo-db at libsql://...
# sqlite>

# Type .quit to exit
```

Your Turso database is now ready! Keep your URL and token handy.

---

## Part 2: Deploy to Render (10 minutes)

### Step 2.1: Push Code to GitHub

```bash
# Make sure you're in the project root
cd c:\DEV\panbooweb

# Add all files
git add .

# Commit
git commit -m "Ready for deployment"

# Push to GitHub
git push origin main
```

### Step 2.2: Deploy Using Blueprint (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub account if not already connected
4. Select your **panbooweb** repository
5. Render will detect `render.yaml` and show:
   - **panboo-api** (Web Service - Backend)
   - **panboo-frontend** (Static Site - Frontend)
6. Click **"Apply"**

Render will start deploying both services!

### Step 2.3: Configure Backend Environment Variables

The backend service will fail initially because environment variables aren't set yet.

1. In Render Dashboard, click on **panboo-api** service
2. Go to **Environment** tab
3. Update these variables:

```env
# Turso Database (Required!)
TURSO_URL=libsql://panboo-db-yourname.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...

# Contract Addresses (Update after deploying contracts)
TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
MASTERCHEF_ADDRESS=0x0000000000000000000000000000000000000000
PANBOO_BNB_PAIR=0x0000000000000000000000000000000000000000

# Already configured in render.yaml:
# CHARITY_WALLET=0xb008e4eE98fF8991fDc079537157eF7ACF2FE614
# RPC_URL=https://bsc-dataseed.binance.org
# CHAIN_ID=56
# PORT=10000
```

4. Click **"Save Changes"**
5. Backend will automatically redeploy

### Step 2.4: Get Backend URL

1. After backend finishes deploying, copy its URL
2. It will be something like: `https://panboo-api.onrender.com`

### Step 2.5: Update Frontend Environment Variables

1. In Render Dashboard, click on **panboo-frontend** service
2. Go to **Environment** tab
3. The `VITE_API_URL` should already be set automatically (via `fromService` in render.yaml)
4. Update **WalletConnect Project ID** (optional but recommended):

```env
VITE_WALLETCONNECT_ID=your-project-id-here
```

5. After deploying contracts, update:

```env
VITE_TOKEN_ADDRESS=0xYourTokenAddress
VITE_MASTERCHEF_ADDRESS=0xYourMasterChefAddress
VITE_CHARITY_WALLET=0xYourCharityWalletAddress
VITE_PANBOO_BNB_PAIR=0xYourPancakeSwapPairAddress
```

6. Click **"Save Changes"**

---

## Part 3: Verify Deployment

### Step 3.1: Check Backend Health

Visit your backend URL + `/health`:
```
https://panboo-api.onrender.com/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "database": "connected"
}
```

### Step 3.2: Check Backend API

Test charity endpoint:
```
https://panboo-api.onrender.com/charity/summary
```

You should see:
```json
{
  "totalDonatedBnb": "0",
  "totalDonatedUsd": "0",
  "txCount": 0,
  "walletBalanceBnb": "0",
  "updatedAt": 1234567890
}
```

### Step 3.3: Check Frontend

Visit your frontend URL:
```
https://panboo-frontend.onrender.com
```

You should see the Panboo homepage with the animated heart!

---

## Part 4: After Smart Contract Deployment

Once you deploy your smart contracts to BSC mainnet:

### Step 4.1: Update Backend Contract Addresses

1. Go to Render Dashboard → **panboo-api**
2. Environment tab
3. Update:
   ```env
   TOKEN_ADDRESS=0xYourPanbooTokenAddress
   MASTERCHEF_ADDRESS=0xYourMasterChefAddress
   PANBOO_BNB_PAIR=0xYourPancakeSwapPairAddress
   ```
4. Save (auto-redeploys)

### Step 4.2: Update Frontend Contract Addresses

1. Go to Render Dashboard → **panboo-frontend**
2. Environment tab
3. Update same addresses:
   ```env
   VITE_TOKEN_ADDRESS=0xYourPanbooTokenAddress
   VITE_MASTERCHEF_ADDRESS=0xYourMasterChefAddress
   VITE_PANBOO_BNB_PAIR=0xYourPancakeSwapPairAddress
   ```
4. Save (auto-redeploys)

### Step 4.3: Verify Blockchain Listener

Check backend logs to see if it's picking up events:
1. Render Dashboard → **panboo-api**
2. **Logs** tab
3. You should see:
   ```
   [INFO] Processing blocks 12345678 to 12345688
   [INFO] Found 2 Transfer events
   [INFO] Found 1 Donation event
   ```

---

## Getting WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Sign up/Login
3. Click "Create Project"
4. Enter project name: "Panboo"
5. Copy your **Project ID**
6. Update `VITE_WALLETCONNECT_ID` in Render

---

## Manual Deployment (Alternative)

If you prefer to deploy services separately instead of using Blueprint:

### Backend (panboo-api)

1. Render Dashboard → New → **Web Service**
2. Connect GitHub repo: **panbooweb**
3. Configure:
   - **Name**: panboo-api
   - **Region**: Oregon (or closest to you)
   - **Branch**: main
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add all environment variables from Step 2.3
5. Create Web Service

### Frontend (panboo-frontend)

1. Render Dashboard → New → **Static Site**
2. Connect GitHub repo: **panbooweb**
3. Configure:
   - **Name**: panboo-frontend
   - **Branch**: main
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add environment variables:
   ```env
   VITE_API_URL=https://panboo-api.onrender.com
   VITE_CHAIN_ID=56
   VITE_RPC_URL=https://bsc-dataseed.binance.org
   VITE_ENABLE_LIVE_FEED=true
   VITE_ENABLE_FAKE_DATA=false
   ```
5. **Rewrites and Redirects**:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: Rewrite
6. Create Static Site

---

## Troubleshooting

### Backend fails to start

**Error**: "Authentication failed" or "Database not found"
- Check `TURSO_URL` matches exactly from `turso db show panboo-db --url`
- Check `TURSO_AUTH_TOKEN` is correct
- Regenerate token: `turso db tokens create panboo-db`

**Error**: "Configuration warnings"
- Contract addresses not set
- Backend will run but serve empty data
- Update addresses after deploying contracts

### Frontend shows "Failed to fetch"

- Check backend is running: visit `https://panboo-api.onrender.com/health`
- Check `VITE_API_URL` in frontend environment variables
- Check CORS settings (should be `CORS_ORIGIN=*` in backend)

### Render free tier sleep

- Backend sleeps after 15 minutes of inactivity
- First request takes 30-60 seconds to wake up
- Consider paid tier ($7/month) for always-on backend

### Database not updating

- Check backend logs for RPC errors
- BSC public RPC can be rate-limited
- Consider paid RPC: Ankr, QuickNode, Infura

---

## Monitoring & Maintenance

### View Backend Logs

Render Dashboard → **panboo-api** → **Logs** tab

Watch for:
- Blockchain listener activity
- API request errors
- Database connection issues

### View Database

```bash
# Access Turso shell
turso db shell panboo-db

# Check tables
.tables

# Check charity contributions
SELECT COUNT(*) FROM charity_contributions;

# Check recent activity
SELECT * FROM live_feed ORDER BY timestamp DESC LIMIT 10;

# Exit
.quit
```

### Backup Database

```bash
# Export to SQL file
turso db shell panboo-db .dump > backup-$(date +%Y%m%d).sql

# View database stats
turso db inspect panboo-db
```

---

## Cost Breakdown

### Free Tier (Perfect for Panboo!)

**Render:**
- Static Sites: Unlimited, free forever
- Web Services: 750 hours/month free (1 service always-on)
- Sleep after 15 min inactivity

**Turso:**
- 9GB storage
- 25M row writes/month
- 500M row reads/month
- Up to 500 databases

**Total**: **$0/month** 🎉

### Paid Tier (If Needed)

**Render:**
- Starter: $7/month per service (no sleep, more resources)

**Turso:**
- Scaler: $29/month (higher limits)

**Total**: $7-36/month depending on traffic

---

## Custom Domain (Optional)

### Step 1: Add Domain to Render

1. Render Dashboard → **panboo-frontend**
2. **Settings** → **Custom Domains**
3. Add your domain: `panboo.com`

### Step 2: Configure DNS

Add CNAME record with your DNS provider:
```
Type: CNAME
Name: @ (or www)
Value: panboo-frontend.onrender.com
```

### Step 3: Update Environment Variables

Update `VITE_API_URL` to use custom domain if needed.

---

## Next Steps

1. ✅ Deploy smart contracts to BSC mainnet
2. ✅ Update contract addresses in Render
3. ✅ Test wallet connection
4. ✅ Monitor charity donations
5. ✅ Share with team

---

## Support Resources

- **Render Docs**: https://render.com/docs
- **Turso Docs**: https://docs.turso.tech
- **Backend README**: [backend/README.md](backend/README.md)
- **Turso Setup**: [backend/TURSO_SETUP.md](backend/TURSO_SETUP.md)

---

## Deployment Checklist

- [ ] Turso database created
- [ ] Turso URL and token saved
- [ ] Code pushed to GitHub
- [ ] Render Blueprint deployed
- [ ] Backend environment variables set
- [ ] Backend health check passes
- [ ] Frontend loads successfully
- [ ] WalletConnect ID configured
- [ ] Smart contracts deployed
- [ ] Contract addresses updated
- [ ] Blockchain listener active
- [ ] Charity tracking working

🎉 **Your Panboo DeFi platform is live!**
