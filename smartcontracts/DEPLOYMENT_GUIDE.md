# Panboo Deployment Guide

## Phase 2 Complete - Smart Contracts Ready! 🎉

All smart contracts have been created and are ready for deployment to BSC testnet/mainnet.

## What's Been Built

### ✅ UI Polish (Complete)
1. **Env Banner** - Only warns on truly empty vars (not placeholders)
2. **Sticky Header** - Active nav state with green underline indicator
3. **Swap Page** - PancakeSwap iframe pre-selects PANBOO token
4. **Home Cards** - Loading skeletons + "Last updated HH:mm:ss" timestamps
5. **Farms Page** - Disabled write operations until BSC + real addresses deployed
6. **Charity Page** - Wallet display with copy button + BscScan link

### ✅ Smart Contracts (Complete)

#### 1. PanbooToken.sol
**Features:**
- BEP-20 compliant token
- 3% buy tax, 5% sell tax
- Automatic swap & donate mechanism
- Threshold: 100k tokens (configurable)
- Reentrancy protected
- PancakeSwap pair auto-created on deployment

**Key Functions:**
- `swapAndDonate()` - Swaps tokens for BNB and sends to charity
- `manualSwapAndDonate()` - Owner can trigger manual donation
- `setTaxRates()` - Update buy/sell tax (max 10%)
- `setSwapThreshold()` - Configure swap threshold
- `setCharityWallet()` - Update charity recipient

**Events:**
- `Donated(tokensSold, bnbSent, to, timestamp)`
- `TaxCollected(from, pair, amount, isSell)`

#### 2. MasterChef.sol
**Features:**
- Multi-pool staking system
- PANBOO rewards distribution
- Configurable emission rate (default: 10 PANBOO/block)
- Emergency withdraw
- Pending rewards calculation

**Key Functions:**
- `add()` - Add new staking pool (owner only)
- `set()` - Update pool allocation points
- `deposit()` - Stake LP tokens
- `withdraw()` - Unstake LP tokens
- `harvest()` - Claim pending rewards
- `emergencyWithdraw()` - Emergency exit (forfeit rewards)
- `updateEmissionRate()` - Adjust reward rate

**Events:**
- `PoolAdded(pid, lpToken, allocPoint)`
- `Deposit(user, pid, amount)`
- `Withdraw(user, pid, amount)`
- `Harvest(user, pid, amount)`
- `EmissionRateUpdated(caller, previousRate, newRate)`

## Deployment Steps

### Prerequisites

1. **Get BSC Testnet BNB:**
   - Visit: https://testnet.bnbchain.org/faucet-smart
   - Request testnet BNB for gas fees

2. **Get BscScan API Key:**
   - Visit: https://bscscan.com/apis
   - Sign up and create API key

3. **Create Charity Wallet:**
   - Create a new wallet address for receiving donations
   - Or use existing wallet

### Step 1: Install Dependencies

```bash
cd contracts
npm install
```

### Step 2: Configure Environment

Create `contracts/.env`:

```env
PRIVATE_KEY=your_deployer_wallet_private_key
CHARITY_WALLET=0x_charity_wallet_address
BSCSCAN_API_KEY=your_bscscan_api_key
```

### Step 3: Deploy to BSC Testnet

```bash
npm run deploy:testnet
```

This will:
- Deploy PanbooToken (1B total supply)
- Create PANBOO/BNB PancakeSwap pair
- Deploy MasterChef staking contract
- Transfer 100M PANBOO to MasterChef for rewards
- Add PANBOO/BNB LP pool with 1000 allocation points
- Save deployment info to `deployment.json`

### Step 4: Verify on BscScan

```bash
# The deployment script will print verification commands
# Example:
npx hardhat verify --network bscTestnet <TOKEN_ADDRESS> ...
npx hardhat verify --network bscTestnet <MASTERCHEF_ADDRESS> ...
```

### Step 5: Add Liquidity

1. Go to PancakeSwap testnet: https://pancakeswap.finance/add/BNB/[TOKEN_ADDRESS]
2. Add initial liquidity (e.g., 10 BNB + equivalent PANBOO)
3. Confirm transaction

### Step 6: Update Frontend

Copy addresses from `deployment.json` to frontend `.env`:

```env
VITE_CHAIN_ID=97
VITE_TOKEN_ADDRESS=<from deployment.json>
VITE_MASTERCHEF_ADDRESS=<from deployment.json>
VITE_CHARITY_WALLET=<from deployment.json>
VITE_PANBOO_BNB_PAIR=<from deployment.json>
VITE_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
```

### Step 7: Deploy Frontend to Render

1. Update environment variables on Render dashboard
2. Render will auto-deploy on git push
3. Test the live site!

## Expected Deployment Artifacts

After successful deployment, you'll have:

```json
{
  "contracts": {
    "PanbooToken": {
      "address": "0x...",
      "charityWallet": "0x...",
      "pancakePair": "0x..."
    },
    "MasterChef": {
      "address": "0x...",
      "rewardPerBlock": "10",
      "startBlock": 12345
    }
  }
}
```

## Testing Checklist

After deployment, test these functions:

### PanbooToken
- [ ] Buy PANBOO on PancakeSwap (3% tax collected)
- [ ] Sell PANBOO on PancakeSwap (5% tax collected)
- [ ] Wait for threshold (or trigger manual swap)
- [ ] Verify BNB sent to charity wallet on BscScan
- [ ] Check Donated event on BscScan

### MasterChef
- [ ] Get LP tokens from PancakeSwap
- [ ] Approve LP tokens to MasterChef
- [ ] Deposit LP tokens (check Deposit event)
- [ ] Wait a few blocks
- [ ] Check pending rewards
- [ ] Harvest rewards (check Harvest event)
- [ ] Withdraw LP tokens (check Withdraw event)

## Mainnet Deployment

When ready for production:

1. Update `hardhat.config.ts` router address to mainnet:
   ```typescript
   const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
   ```

2. Ensure you have enough BNB for deployment (~0.05 BNB)

3. Deploy:
   ```bash
   npm run deploy:mainnet
   ```

4. Add significant liquidity (recommend 100+ BNB)

5. Update frontend to chain ID 56

## Security Notes

- ✅ Contracts use OpenZeppelin libraries
- ✅ Reentrancy guards on all critical functions
- ✅ Owner-only administrative functions
- ✅ Tax rate limits (max 10%)
- ✅ Emergency withdraw available
- ⚠️ Consider audit before mainnet launch

## Support

For issues or questions:
- Check Hardhat docs: https://hardhat.org/docs
- BSC docs: https://docs.bnbchain.org
- PancakeSwap docs: https://docs.pancakeswap.finance

## Next: Phase 3 - Integration

After contracts are deployed:

1. Wire frontend hooks to real contracts
2. Implement live price feed from LP reserves
3. Connect API for charity tracking
4. Enable live transaction feed
5. Final testing and launch! 🚀
