# Panboo Smart Contracts

Smart contracts for the Panboo DeFi-for-Charity platform on BNB Smart Chain.

## Contracts

### PanbooToken.sol
BEP-20 token with automatic charity donations:
- **Name:** Panboo
- **Symbol:** PNB
- **Decimals:** 18
- **Total Supply:** 10,000,000,000 PNB (10 billion)
- **Buy Tax:** 3%
- **Sell Tax:** 7%
- **Auto Swap & Donate:** Converts accumulated tax to BNB and sends to charity wallet
- **Threshold:** 100k tokens (configurable)
- **Features:** Reentrancy protected, owner-controlled tax rates

### MasterChef.sol
Staking contract for LP token rewards:
- Supports multiple staking pools
- Configurable reward emission rate (default: 10 PNB/block)
- Deposit, withdraw, harvest, and emergency withdraw functions
- Pending rewards calculation
- Owner can adjust emission rate and add/update pools

## Setup

### 1. Install Dependencies

```bash
cd contracts
npm install
```

### 2. Configure Environment

Create a `.env` file in the `contracts/` directory:

```env
PRIVATE_KEY=your_wallet_private_key_here
CHARITY_WALLET=0x_your_charity_wallet_address
BSCSCAN_API_KEY=your_bscscan_api_key
```

Get a BscScan API key: https://bscscan.com/apis

### 3. Compile Contracts

```bash
npm run compile
```

## Deployment

### Deploy to BSC Testnet

```bash
npm run deploy:testnet
```

### Deploy to BSC Mainnet

```bash
npm run deploy:mainnet
```

The deployment script will:
1. Deploy PanbooToken with charity mechanism
2. Create PANBOO/BNB pair on PancakeSwap
3. Deploy MasterChef staking contract
4. Transfer 100M PANBOO to MasterChef for rewards
5. Add initial PANBOO/BNB LP pool
6. Save deployment info to `deployment.json`

## Verification

After deployment, verify contracts on BscScan:

```bash
# Verify PanbooToken
npx hardhat verify --network bscTestnet <TOKEN_ADDRESS> "Panboo Token" "PANBOO" "1000000000000000000000000000" "<CHARITY_WALLET>" "<PANCAKE_ROUTER>"

# Verify MasterChef
npx hardhat verify --network bscTestnet <MASTERCHEF_ADDRESS> "<TOKEN_ADDRESS>" "10000000000000000000" "<START_BLOCK>"
```

## Post-Deployment Steps

### 1. Add Liquidity on PancakeSwap

Visit: https://pancakeswap.finance/add/BNB/[TOKEN_ADDRESS]

Add initial liquidity (e.g., 100 BNB + equivalent PANBOO tokens)

### 2. Update Frontend Environment Variables

Copy addresses from `deployment.json` to your frontend `.env`:

```env
VITE_TOKEN_ADDRESS=0x...
VITE_MASTERCHEF_ADDRESS=0x...
VITE_CHARITY_WALLET=0x...
VITE_PANBOO_BNB_PAIR=0x...
```

### 3. Update Contract ABIs

Export ABIs to frontend:

```bash
cp artifacts/contracts/PanbooToken.sol/PanbooToken.json ../src/contracts/abis/PanbooToken.json
cp artifacts/contracts/MasterChef.sol/MasterChef.json ../src/contracts/abis/MasterChef.json
```

## Testing Locally

Run Hardhat tests:

```bash
npm test
```

## Contract Addresses

### BSC Testnet (Chain ID: 97)
- **PancakeSwap Router:** `0xD99D1c33F9fC3444f8101754aBC46c52416550D1`
- **PancakeSwap Factory:** `0x6725F303b657a9451d8BA641348b6761A6CC7a17`

### BSC Mainnet (Chain ID: 56)
- **PancakeSwap Router:** `0x10ED43C718714eb63d5aA57B78B54704E256024E`
- **PancakeSwap Factory:** `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73`

## Security Features

- ✅ OpenZeppelin contracts (Ownable, ReentrancyGuard, SafeERC20)
- ✅ Reentrancy protection on all external calls
- ✅ Safe math operations
- ✅ Owner-only administrative functions
- ✅ Emergency withdraw functionality
- ✅ Tax rate limits (max 10%)

## License

MIT
