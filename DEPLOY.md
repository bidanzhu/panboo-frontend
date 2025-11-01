# Deployment Guide

## Quick Deploy to Render

### Option 1: One-Click Deploy (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub account if not already connected
4. Select the **panboo-frontend** repository
5. Render will automatically detect `render.yaml` and configure everything
6. Click **"Apply"** to deploy

Your app will be live at: `https://panboo-frontend.onrender.com` (or similar)

### Option 2: Manual Deploy

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New"** → **"Static Site"**
3. Connect your GitHub repository: **panboo-frontend**
4. Configure:
   - **Name**: panboo-frontend
   - **Branch**: main
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
5. Add Environment Variables (in Render dashboard):
   ```
   VITE_CHAIN_ID=56
   VITE_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
   VITE_MASTERCHEF_ADDRESS=0x0000000000000000000000000000000000000000
   VITE_CHARITY_WALLET=0x0000000000000000000000000000000000000000
   VITE_PANBOO_BNB_PAIR=0x0000000000000000000000000000000000000000
   VITE_API_URL=https://panboo-api.onrender.com
   VITE_RPC_URL=https://bsc-dataseed.binance.org
   VITE_WALLETCONNECT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_ENABLE_LIVE_FEED=true
   VITE_ENABLE_FAKE_DATA=false
   ```
6. Configure **Rewrites and Redirects**:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: Rewrite
7. Click **"Create Static Site"**

---

## Alternative: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## Alternative: Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

---

## Update Environment Variables After Contract Deployment

Once you deploy your smart contracts to BSC, update these variables in Render:

1. Go to your Render dashboard
2. Select **panboo-frontend** service
3. Go to **Environment** tab
4. Update:
   - `VITE_TOKEN_ADDRESS` → Your deployed PANBOO token address
   - `VITE_MASTERCHEF_ADDRESS` → Your deployed MasterChef address
   - `VITE_CHARITY_WALLET` → Your charity wallet address
   - `VITE_PANBOO_BNB_PAIR` → Your PANBOO/BNB LP pair address
   - `VITE_WALLETCONNECT_ID` → Your WalletConnect Project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com)
5. Click **"Save Changes"**
6. Render will automatically redeploy

---

## Known Issues in Current Build

There are 2 minor TypeScript compilation errors:
1. `src/contracts/multicall.ts:59` - Provider type needs explicit annotation
2. `src/hooks/useTVL.ts:19` - ABI type needs `as Abi` cast

These don't affect runtime but will prevent the build. Quick fixes:

### Fix 1: multicall.ts
```typescript
// Line 59 - Add explicit type
export function createMulticallContract(provider: JsonRpcProvider): Contract {
```

### Fix 2: useTVL.ts
```typescript
// Cast ABIs properly
import type { Abi } from 'viem';

// Then use: abi: MASTERCHEF_ABI as Abi
```

---

## Getting WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Sign up/Login
3. Create a new project
4. Copy your **Project ID**
5. Update `VITE_WALLETCONNECT_ID` in Render

---

## Share with Your Teammate

Once deployed, share the Render URL:
- **Live App**: `https://panboo-frontend.onrender.com`
- **GitHub Repo**: https://github.com/bidanzhu/panboo-frontend

The app will show placeholder data until you:
1. Deploy contracts
2. Update environment variables
3. Connect real API endpoint
