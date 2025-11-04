# Panboo DeFi-for-Charity - Complete Codebase Walkthrough

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Smart Contracts](#smart-contracts)
4. [Backend API](#backend-api)
5. [Frontend Application](#frontend-application)
6. [Data Flow](#data-flow)
7. [Key Features](#key-features)
8. [Configuration](#configuration)
9. [Development Workflow](#development-workflow)

---

## Project Overview

**Panboo** is a DeFi (Decentralized Finance) platform on Binance Smart Chain (BSC) that combines:
- **Token trading** with automatic charity donations
- **Yield farming** for liquidity providers
- **Transparent charity tracking** on-chain

### Tech Stack
- **Smart Contracts**: Solidity 0.8.20 (Hardhat)
- **Backend**: Node.js + Express + Turso (SQLite)
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Blockchain**: BSC (Binance Smart Chain)
- **Web3**: wagmi v2 + viem + RainbowKit

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │   React Frontend (Vite + TypeScript)            │   │
│  │   - wagmi/viem for blockchain interaction       │   │
│  │   - RainbowKit for wallet connection            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │                                    │
         │ RPC Calls                          │ HTTP API
         ▼                                    ▼
┌─────────────────────┐          ┌──────────────────────┐
│   BSC Blockchain    │          │   Node.js Backend    │
│  ┌───────────────┐  │          │  ┌────────────────┐  │
│  │ PanbooToken   │  │          │  │ Express API    │  │
│  │ (ERC20)       │  │          │  │ Port 3002      │  │
│  └───────────────┘  │          │  └────────────────┘  │
│  ┌───────────────┐  │          │  ┌────────────────┐  │
│  │ MasterChef    │  │◄─────────┤  │ Listener       │  │
│  │ (Farming)     │  │ Monitor  │  │ (Event Sync)   │  │
│  └───────────────┘  │          │  └────────────────┘  │
│  ┌───────────────┐  │          │  ┌────────────────┐  │
│  │ PancakeSwap   │  │          │  │ Turso Database │  │
│  │ (DEX)         │  │          │  │ (SQLite)       │  │
│  └───────────────┘  │          │  └────────────────┘  │
└─────────────────────┘          └──────────────────────┘
```

---

## Smart Contracts

### 1. PanbooToken.sol

**Location**: `smartcontracts/contracts/PanbooToken.sol`

**Purpose**: ERC20 token with automatic charity donations via buy/sell taxes

#### Key Features

**a) Tokenomics**
```solidity
Total Supply: 1,000,000,000 PANBOO
Decimals: 18
Symbol: PNB
```

**b) Tax System**
- **Buy Tax**: 3% (configurable, max 10%)
- **Sell Tax**: 5% (configurable, max 10%)
- Taxes collected in PANBOO tokens
- Auto-swap to BNB when threshold reached
- BNB sent to charity wallet

**c) Tax Timelock (Security Feature)**
```solidity
// Prevents rug pulls - owner can't change taxes instantly
uint256 public constant TAX_CHANGE_DELAY = 24 hours;

function scheduleTaxRateChange(uint16 _buyTaxBps, uint16 _sellTaxBps) external onlyOwner {
    // Tax change scheduled, must wait 24 hours to execute
}

function executeTaxRateChange() external onlyOwner {
    // Can only execute after 24 hours
}
```

**d) Tax Exclusions**
Certain addresses don't pay tax:
- Token contract itself
- MasterChef contract
- Charity wallet
- Owner wallet
- Any address marked as excluded

**e) Auto-Swap Mechanism**
```solidity
uint256 public swapThreshold = 100_000 * 10**18; // 100k PANPANBOO.ORGBOO

function _transfer(...) internal {
    // If accumulated tax >= threshold:
    // 1. Swap PANBOO → BNB via PancakeSwap
    // 2. Send BNB to charity wallet
    // 3. Emit CharityDonation event
}
```

**f) Circuit Breaker**
```solidity
bool public tradingEnabled = true;

function setTradingEnabled(bool _enabled) external onlyOwner {
    // Emergency stop for trading
}
```

#### Important Functions

```solidity
// Tax Management
function scheduleTaxRateChange(uint16 _buyTaxBps, uint16 _sellTaxBps) external onlyOwner
function executeTaxRateChange() external onlyOwner
function cancelTaxRateChange() external onlyOwner

// Configuration
function setCharityWallet(address _charityWallet) external onlyOwner
function setSwapThreshold(uint256 _swapThreshold) external onlyOwner
function setSwapEnabled(bool _enabled) external onlyOwner
function setExcludedFromTax(address account, bool excluded) external onlyOwner

// Manual Operations
function manualSwapAndDonate() external onlyOwner
function setTradingEnabled(bool _enabled) external onlyOwner
```

#### Events
```solidity
event CharityDonation(uint256 bnbAmount, uint256 tokenAmount);
event TaxCollected(address indexed from, address indexed to, uint256 amount);
event TaxRateScheduled(uint16 buyTaxBps, uint16 sellTaxBps, uint256 executeAfter);
event TaxRateChanged(uint16 buyTaxBps, uint16 sellTaxBps);
```

---

### 2. MasterChef.sol

**Location**: `smartcontracts/contracts/MasterChef.sol`

**Purpose**: Yield farming - stake LP tokens, earn PANBOO rewards

#### Key Concepts

**a) Pool System**
```solidity
struct PoolInfo {
    IERC20 lpToken;           // LP token address (e.g., PANBOO/BNB LP)
    uint256 allocPoint;       // Reward weight (higher = more rewards)
    uint256 lastRewardBlock;  // Last block rewards were calculated
    uint256 accRewardPerShare; // Accumulated rewards per share
}

PoolInfo[] public poolInfo;
```

**b) User Staking**
```solidity
struct UserInfo {
    uint256 amount;     // How many LP tokens staked
    uint256 rewardDebt; // Rewards already claimed (for calculation)
}

mapping(uint256 => mapping(address => UserInfo)) public userInfo;
```

**c) Reward Calculation**
```solidity
Emission Rate: X PANBOO per block (configurable)
User Rewards = (User LP / Total LP) × (Blocks × Emission Rate) × (Pool Weight / Total Weight)

Example:
- Emission: 10 PNB/block
- Pool 0 (PANBOO/BNB): 1000 allocation points
- Pool 1 (BUSD/BNB): 500 allocation points
- Total: 1500 points

Pool 0 gets: 10 × (1000/1500) = 6.67 PNB/block
Pool 1 gets: 10 × (500/1500) = 3.33 PNB/block

If you stake 10% of Pool 0's LP:
Your rewards = 6.67 × 0.10 = 0.667 PNB/block
```

#### Important Functions

```solidity
// User Functions
function deposit(uint256 _pid, uint256 _amount) external
function withdraw(uint256 _pid, uint256 _amount) external
function emergencyWithdraw(uint256 _pid) external

// View Functions
function pendingReward(uint256 _pid, address _user) external view returns (uint256)
function poolLength() external view returns (uint256)

// Admin Functions
function add(uint256 _allocPoint, IERC20 _lpToken, bool _withUpdate) external onlyOwner
function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) external onlyOwner
function updateEmissionRate(uint256 _rewardPerBlock) external onlyOwner
```

#### Events
```solidity
event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
```

---

### 3. Deployment Process

**Location**: `smartcontracts/scripts/deploy.js`

**Deployment Steps**:
1. Deploy PanbooToken
2. Create PANBOO/BNB LP pair on PancakeSwap
3. Deploy MasterChef
4. Add initial LP pool to MasterChef
5. Exclude MasterChef from taxes
6. Verify contracts on BscScan

**Deployed Addresses (Testnet)**:
```javascript
TOKEN_ADDRESS=0x4D62931968fd185423cBf4eA029Be4D48C35312E
MASTERCHEF_ADDRESS=0xD9B2B2288E14D7bE024012289e149a8B9Cf9CfDD
CHARITY_WALLET=0xb008d3c90e2f6dd63d4a0bd3ad6f6389f333cd1d
PANBOO_BNB_PAIR=0x89D27Bc3Fb398055F6bDefdd66B259BE60BCa2b2
```

---

## Backend API

### Architecture

**Tech Stack**:
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: Turso (libSQL/SQLite)
- **Blockchain**: ethers.js v6

**Main Files**:
```
backend/
├── src/
│   ├── index.js           # Entry point
│   ├── api.js             # Express routes
│   ├── config.js          # Environment config
│   ├── db.js              # Database setup
│   ├── listener.js        # Blockchain event listener
│   ├── services/
│   │   └── priceService.js # Price fetching
│   └── utils/
│       └── logger.js       # Logging utility
└── package.json
```

---

### 1. Database Schema

**File**: `backend/src/db.js`

**Tables**:

**a) charity_donations**
```sql
CREATE TABLE IF NOT EXISTS charity_donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_hash TEXT UNIQUE NOT NULL,
  block_number INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  from_address TEXT NOT NULL,
  amount_bnb TEXT NOT NULL,      -- Stored as string (BigNumber)
  amount_usd TEXT,               -- USD value at time of donation
  created_at INTEGER NOT NULL
)
```

**b) pool_states**
```sql
CREATE TABLE IF NOT EXISTS pool_states (
  pool_id INTEGER PRIMARY KEY,
  lp_token TEXT NOT NULL,
  alloc_point INTEGER NOT NULL,
  total_staked TEXT NOT NULL,
  reward_per_block TEXT,
  last_reward_block INTEGER,
  last_updated INTEGER NOT NULL
)
```

**c) user_stakes**
```sql
CREATE TABLE IF NOT EXISTS user_stakes (
  user_address TEXT NOT NULL,
  pool_id INTEGER NOT NULL,
  staked_amount TEXT NOT NULL,
  pending_rewards TEXT,
  last_updated INTEGER NOT NULL,
  PRIMARY KEY (user_address, pool_id)
)
```

**d) activity_feed**
```sql
CREATE TABLE IF NOT EXISTS activity_feed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,      -- 'swap', 'stake', 'unstake', 'harvest', 'donation'
  user_address TEXT,
  amount TEXT,
  metadata TEXT,                 -- JSON data
  created_at INTEGER NOT NULL
)
```

**e) listener_state**
```sql
CREATE TABLE IF NOT EXISTS listener_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_processed_block INTEGER NOT NULL,
  last_updated INTEGER NOT NULL
)
```

---

### 2. Blockchain Listener

**File**: `backend/src/listener.js`

**Purpose**: Monitors blockchain for events and updates database

**Flow**:
```javascript
1. Every POLL_INTERVAL (default: 1 hour):
   ↓
2. Get last_processed_block from database
   ↓
3. Get current block from blockchain
   ↓
4. Fetch all events from last_processed_block to current block
   ↓
5. Process each event:
   - CharityDonation → Insert into charity_donations + activity_feed
   - Deposit → Update user_stakes + activity_feed
   - Withdraw → Update user_stakes + activity_feed
   ↓
6. Update last_processed_block
   ↓
7. Wait POLL_INTERVAL, repeat
```

**Event Processing**:
```javascript
// Listen for CharityDonation events
const charityFilter = contract.filters.CharityDonation();
const charityEvents = await contract.queryFilter(charityFilter, fromBlock, toBlock);

for (const event of charityEvents) {
  const { bnbAmount, tokenAmount } = event.args;
  const tx = await event.getTransaction();

  // Insert into database
  await queries.insertCharityDonation({
    txHash: event.transactionHash,
    blockNumber: event.blockNumber,
    timestamp: block.timestamp,
    fromAddress: tx.from,
    amountBnb: bnbAmount.toString(),
    amountUsd: calculateUSD(bnbAmount)
  });
}
```

**Batch Processing**:
To avoid RPC rate limits, processes blocks in chunks:
```javascript
const BATCH_SIZE = 100; // Process 100 blocks at a time
for (let i = fromBlock; i <= toBlock; i += BATCH_SIZE) {
  const batchEnd = Math.min(i + BATCH_SIZE - 1, toBlock);
  await processBlockRange(i, batchEnd);
}
```

---

### 3. API Endpoints

**File**: `backend/src/api.js`

**Base URL**: `http://localhost:3002`

#### Health & Config

```javascript
GET /health
Response: { status: 'ok', timestamp: number, uptime: number }

GET /config
Response: {
  chainId: 97,
  rpcUrl: string,
  pollInterval: 3600000,
  pollIntervalMinutes: "60.0",
  pollIntervalHours: "1.00",
  tokenAddress: string,
  masterChefAddress: string,
  charityWallet: string,
  panbooBnbPair: string,
  port: 3002,
  logLevel: "info"
}
```

#### Token Endpoints

```javascript
GET /token/price
Response: {
  panbooUsd: "0.00",
  bnbUsd: "0.00",
  lastUpdated: timestamp
}
```

#### Charity Endpoints

```javascript
GET /charity/summary
Response: {
  totalDonatedBnb: "0",
  totalDonatedUsd: "0",
  txCount: 0,
  walletBalanceBnb: "0",
  updatedAt: timestamp
}

GET /charity/recent?limit=10
Response: [{
  txHash: string,
  timestamp: number,
  from: address,
  amountBnb: string,
  amountUsd: string
}]

GET /charity/top?limit=10
Response: [{
  address: string,
  totalBnb: string,
  totalUsd: string,
  txCount: number
}]

GET /charity/daily?days=30
Response: [{
  date: "2025-01-15",
  totalBnb: string,
  totalUsd: string,
  txCount: number
}]
```

#### Farm Endpoints

```javascript
GET /farms/pools
Response: [{
  poolId: 0,
  lpToken: address,
  allocPoint: number,
  totalStaked: string,
  rewardPerBlock: string,
  lastRewardBlock: number,
  lastUpdated: timestamp,
  apr: "0",
  tvl: "0"
}]

GET /farms/summary
Response: {
  totalTvlUsd: "0",
  activePools: number,
  totalRewardsDistributed: "0"
}

GET /farms/user/:address
Response: [{
  poolId: 0,
  stakedAmount: string,
  pendingRewards: string,
  lastUpdated: timestamp
}]
```

#### Live Feed

```javascript
GET /feed/live?limit=10
Response: [{
  id: number,
  timestamp: number,
  eventType: "swap" | "stake" | "unstake" | "harvest" | "donation",
  user: address,
  amount: string,
  metadata: object
}]
```

---

### 4. Price Service

**File**: `backend/src/services/priceService.js`

**Purpose**: Fetches token prices from DEX and caches them

**Flow**:
```javascript
1. Every 30 seconds:
   ↓
2. Read PANBOO/BNB LP reserves from PancakeSwap
   price_panboo_bnb = reserve_bnb / reserve_panboo
   ↓
3. Read BNB/BUSD LP reserves
   price_bnb_usd = reserve_busd / reserve_bnb
   ↓
4. Calculate PANBOO/USD
   price_panboo_usd = price_panboo_bnb × price_bnb_usd
   ↓
5. Cache prices in memory
```

**Implementation**:
```javascript
const cachedPrices = {
  panbooUsd: '0.00',
  bnbUsd: '0.00',
  lastUpdated: 0
};

async function updatePrices() {
  try {
    // Get PANBOO/BNB reserves
    const panbooContract = new ethers.Contract(PANBOO_BNB_PAIR, PAIR_ABI, provider);
    const [reserve0, reserve1] = await panbooContract.getReserves();
    const panbooBnbPrice = reserve1 / reserve0; // BNB per PANBOO

    // Get BNB/USD from BUSD pair
    const bnbBusdPair = '0x...';
    const busdContract = new ethers.Contract(bnbBusdPair, PAIR_ABI, provider);
    const [busdReserve0, busdReserve1] = await busdContract.getReserves();
    const bnbUsdPrice = busdReserve0 / busdReserve1;

    // Calculate PANBOO/USD
    cachedPrices.panbooUsd = (panbooBnbPrice * bnbUsdPrice).toFixed(6);
    cachedPrices.bnbUsd = bnbUsdPrice.toFixed(2);
    cachedPrices.lastUpdated = Date.now();
  } catch (error) {
    logger.error('Failed to update prices', error);
  }
}

setInterval(updatePrices, 30000); // Update every 30 seconds
```

---

## Frontend Application

### Architecture

**Tech Stack**:
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 6
- **Routing**: React Router v6
- **Styling**: TailwindCSS 3 + shadcn/ui
- **Web3**: wagmi v2 + viem + RainbowKit
- **State**: React Query (TanStack Query)
- **Charts**: Recharts
- **Notifications**: Sonner (toast)

**Structure**:
```
src/
├── main.tsx               # Entry point
├── App.tsx                # Router setup
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── Header.tsx        # Navigation
│   ├── Footer.tsx
│   ├── WalletConnectButton.tsx
│   ├── ThemeProvider.tsx
│   ├── ThemeToggle.tsx
│   └── EnvValidator.tsx  # Validates .env config
├── pages/
│   ├── Home.tsx          # Landing page
│   ├── Swap.tsx          # Token swapping
│   ├── Farms.tsx         # Staking/farming
│   ├── Charity.tsx       # Donation stats
│   └── Admin.tsx         # Owner controls
├── hooks/
│   ├── useChainReady.ts  # Chain validation
│   ├── useAPI.ts         # Backend API calls
│   ├── useFarmActions.ts # Farm operations
│   └── useSwap.ts        # Swap operations
├── config/
│   ├── wagmi.ts          # Web3 config
│   └── chains.ts         # Chain definitions
├── contracts/
│   ├── addresses.ts      # Contract addresses
│   └── abis.ts           # Contract ABIs
├── types/
│   └── index.ts          # TypeScript types
├── utils/
│   ├── bigNumber.ts      # BigNumber helpers
│   ├── formatters.ts     # Display formatters
│   └── calculations.ts   # Math utilities
└── styles/
    └── index.css         # Global styles
```

---

### 1. Web3 Configuration

**File**: `src/config/wagmi.ts`

**wagmi Setup**:
```typescript
import { createConfig, http } from 'wagmi';
import { bsc, bscTestnet } from './chains';
import { walletConnect, injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [bsc, bscTestnet],

  // Wallet connectors
  connectors: [
    injected({ shimDisconnect: true }),  // MetaMask, Trust Wallet, etc.
    walletConnect({
      projectId: WALLETCONNECT_ID,
      metadata: {
        name: 'Panboo',
        description: 'Transparent DeFi for Charity',
        url: 'https://panboo.org',
        icons: ['https://panboo.org/logo.png']
      }
    })
  ],

  // RPC endpoints
  transports: {
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
    [bscTestnet.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545')
  }
});
```

**Chain Configuration** (`src/config/chains.ts`):
```typescript
export const bscTestnet: Chain = {
  id: 97,
  name: 'BNB Smart Chain Testnet',
  nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://data-seed-prebsc-1-s1.binance.org:8545'] }
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://testnet.bscscan.com' }
  },
  contracts: {
    multicall3: {
      address: '0xe348b292e8eA5FAB54340656f3D374b259D658b8',
      blockCreated: 17422483
    }
  },
  testnet: true
};
```

---

### 2. Contract Interaction

**File**: `src/contracts/addresses.ts`

**Environment Variables**:
```typescript
export const ENV = {
  CHAIN_ID: parseInt(import.meta.env.VITE_CHAIN_ID || '56'),
  TOKEN_ADDRESS: import.meta.env.VITE_TOKEN_ADDRESS || '0x0...',
  MASTERCHEF_ADDRESS: import.meta.env.VITE_MASTERCHEF_ADDRESS || '0x0...',
  CHARITY_WALLET: import.meta.env.VITE_CHARITY_WALLET || '0x0...',
  PANBOO_BNB_PAIR: import.meta.env.VITE_PANBOO_BNB_PAIR || '0x0...',
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3002',
  RPC_URL: import.meta.env.VITE_RPC_URL || 'https://bsc-dataseed.binance.org',
  WALLETCONNECT_ID: import.meta.env.VITE_WALLETCONNECT_ID || '',
  ENABLE_LIVE_FEED: import.meta.env.VITE_ENABLE_LIVE_FEED === 'true',
  ENABLE_FAKE_DATA: import.meta.env.VITE_ENABLE_FAKE_DATA === 'true'
};

export const ADDRESSES = {
  PANBOO_TOKEN: ENV.TOKEN_ADDRESS,
  MASTERCHEF: ENV.MASTERCHEF_ADDRESS,
  CHARITY_WALLET: ENV.CHARITY_WALLET,
  PANBOO_BNB_PAIR: ENV.PANBOO_BNB_PAIR,
  MULTICALL3: getMulticall3Address()
};
```

**Reading from Contract**:
```typescript
import { useReadContract } from 'wagmi';
import { ADDRESSES } from '@/contracts/addresses';
import { PANBOO_TOKEN_ABI } from '@/contracts/abis';

function MyComponent() {
  const { data: balance } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [userAddress]
  });

  return <div>Balance: {formatUnits(balance || 0n, 18)} PANBOO</div>;
}
```

**Writing to Contract**:
```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

function ApproveButton() {
  const { writeContractAsync } = useWriteContract();
  const [pendingTx, setPendingTx] = useState<string | null>(null);

  const { isLoading } = useWaitForTransactionReceipt({
    hash: pendingTx as `0x${string}` | undefined
  });

  const handleApprove = async () => {
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.PANBOO_TOKEN,
        abi: PANBOO_TOKEN_ABI,
        functionName: 'approve',
        args: [ADDRESSES.MASTERCHEF, parseUnits('1000000', 18)]
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast.success('Approval confirmed!');
    } catch (error) {
      toast.error('Transaction failed');
    }
  };

  return (
    <button onClick={handleApprove} disabled={isLoading}>
      {isLoading ? 'Approving...' : 'Approve'}
    </button>
  );
}
```

---

### 3. Custom Hooks

#### a) useChainReady

**File**: `src/hooks/useChainReady.ts`

**Purpose**: Ensures user is on correct chain before transactions

```typescript
export function useChainReady() {
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const ensureReady = useCallback(async (): Promise<boolean> => {
    // Check if connected
    if (!chain) {
      toast.error('Please connect your wallet');
      return false;
    }

    // Check if on correct chain
    if (chain.id !== ENV.CHAIN_ID) {
      try {
        await switchChainAsync({ chainId: ENV.CHAIN_ID });
        return true;
      } catch (error) {
        toast.error(`Please switch to ${ENV.CHAIN_ID === 97 ? 'BSC Testnet' : 'BSC Mainnet'}`);
        return false;
      }
    }

    return true;
  }, [chain, switchChainAsync]);

  return { ensureReady, isReady: chain?.id === ENV.CHAIN_ID };
}
```

#### b) useAPI

**File**: `src/hooks/useAPI.ts`

**Purpose**: Fetches data from backend API with caching

```typescript
export function useAPI<T>(endpoint: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['api', endpoint],
    queryFn: async () => {
      const response = await fetch(`${ENV.API_URL}${endpoint}`);
      if (!response.ok) throw new Error('API error');
      return response.json() as Promise<T>;
    },
    enabled: options?.enabled !== false,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000 // 1 minute
  });
}

// Usage
function CharityStats() {
  const { data, isLoading } = useAPI<CharitySummary>('/charity/summary');

  if (isLoading) return <div>Loading...</div>;

  return <div>Total Donated: ${data?.totalDonatedUsd}</div>;
}
```

#### c) useFarmActions

**File**: `src/hooks/useFarmActions.ts`

**Purpose**: Handles all farming operations (stake, unstake, harvest)

```typescript
export function useFarmActions(poolId: number) {
  const { ensureReady } = useChainReady();
  const { writeContractAsync } = useWriteContract();
  const [pendingTx, setPendingTx] = useState<string | null>(null);

  // Stake LP tokens
  const stake = useCallback(async (amount: string) => {
    if (!ensureReady()) return;

    try {
      toast.info('Staking...');

      const hash = await writeContractAsync({
        address: ADDRESSES.MASTERCHEF,
        abi: MASTERCHEF_ABI,
        functionName: 'deposit',
        args: [BigInt(poolId), parseUnits(amount, 18)]
      });

      setPendingTx(hash);
      toast.success('Transaction submitted!');

      await new Promise(r => setTimeout(r, 3000));
      toast.success('Staking successful!');
    } catch (error) {
      toast.error('Staking failed');
    }
  }, [poolId, ensureReady, writeContractAsync]);

  // Similar for unstake() and harvest()...

  return { stake, unstake, harvest, isLoading: !!pendingTx };
}
```

---

### 4. Page Components

#### a) Home Page

**File**: `src/pages/Home.tsx`

**Purpose**: Landing page with project overview

**Sections**:
1. Hero - Main tagline and stats
2. Features - Key features explained
3. Tokenomics - Supply, taxes, distribution
4. Charity Impact - Real-time donation stats
5. How It Works - Step-by-step guide
6. Call to Action - Links to swap/farm

#### b) Swap Page

**File**: `src/pages/Swap.tsx`

**Purpose**: Buy/sell PANBOO tokens

**Flow**:
```
1. User enters amount
   ↓
2. Calculate output (via PancakeSwap quoter)
   ↓
3. Show price impact & tax
   ↓
4. User clicks "Swap"
   ↓
5. Check allowance
   ↓
6. If needed: Approve token
   ↓
7. Execute swap via PancakeSwap router
   ↓
8. Show confirmation
```

**Key Features**:
- Real-time price quotes
- Slippage tolerance settings
- Price impact warnings
- Tax display (3% buy, 5% sell)
- Transaction history

#### c) Farms Page

**File**: `src/pages/Farms.tsx`

**Purpose**: Stake LP tokens, earn PANBOO rewards

**Features**:
1. **Pool List**: Shows all available pools
   - APR calculation
   - TVL (Total Value Locked)
   - Your staked amount
   - Pending rewards

2. **Staking Process**:
   ```
   Step 1: Get LP tokens
     → Add liquidity on PancakeSwap
     → Receive PANBOO/BNB LP tokens

   Step 2: Approve LP token
     → Allow MasterChef to spend LP tokens

   Step 3: Stake
     → Deposit LP tokens into pool
     → Start earning rewards

   Step 4: Harvest
     → Claim accumulated PANBOO rewards
     → Anytime, no lock period
   ```

3. **Pool Management** (Admin only):
   - Add new pools
   - Adjust allocation points
   - Update emission rate

#### d) Charity Page

**File**: `src/pages/Charity.tsx`

**Purpose**: Track charity donations

**Sections**:
1. **Summary Stats**:
   - Total BNB donated
   - Total USD value
   - Number of donations
   - Average donation size

2. **Recent Donations**:
   - List of recent donations
   - TX hash, amount, timestamp
   - Link to BscScan

3. **Top Donors**:
   - Leaderboard of biggest contributors
   - Gamification element

4. **Daily Chart**:
   - Line graph of daily donations
   - Shows charity momentum

5. **Live Feed**:
   - Real-time donation stream
   - Animated notifications

#### e) Admin Page

**File**: `src/pages/Admin.tsx`

**Purpose**: Owner-only controls

**Access Control**:
```typescript
const { data: contractOwner } = useReadContract({
  address: ADDRESSES.PANBOO_TOKEN,
  abi: PANBOO_TOKEN_ABI,
  functionName: 'owner'
});

const isOwner = address?.toLowerCase() === contractOwner?.toLowerCase();

if (!isOwner) return <AccessDenied />;
```

**Features**:

1. **Tax Management**:
   - Schedule tax rate changes (24hr timelock)
   - View pending changes
   - Execute/cancel scheduled changes

2. **Charity Wallet**:
   - Update charity wallet address
   - Manual trigger swap & donate

3. **Swap Settings**:
   - Set swap threshold
   - Enable/disable auto-swap

4. **Farm Management**:
   - View all pools
   - Add new pool
   - Update pool allocation
   - Change emission rate

5. **Tax Exclusions**:
   - Exclude addresses from tax
   - Check if address is excluded

6. **Circuit Breaker**:
   - Emergency trading halt
   - Enable/disable trading

7. **Backend Configuration** (NEW):
   - View poll interval
   - Contract addresses
   - Chain info
   - Instructions to update settings

---

### 5. Utility Functions

#### a) BigNumber Helpers

**File**: `src/utils/bigNumber.ts`

```typescript
import { formatUnits, parseUnits } from 'ethers';

// Convert BigInt to human-readable string
export function formatBigNumber(
  value: bigint | string,
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  const formatted = formatUnits(value, decimals);
  const num = parseFloat(formatted);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals
  });
}

// Convert user input to BigInt
export function parseBigNumber(
  value: string,
  decimals: number = 18
): bigint {
  try {
    return parseUnits(value, decimals);
  } catch {
    return 0n;
  }
}

// Calculate percentage
export function calculatePercent(
  numerator: bigint,
  denominator: bigint
): number {
  if (denominator === 0n) return 0;
  return Number((numerator * 10000n) / denominator) / 100;
}

// Add two BigInts safely
export function addBigNumbers(a: bigint, b: bigint): bigint {
  return a + b;
}

// Multiply BigInt by number (for percentages)
export function multiplyByPercent(
  amount: bigint,
  percent: number
): bigint {
  return (amount * BigInt(Math.floor(percent * 100))) / 10000n;
}
```

#### b) Display Formatters

**File**: `src/utils/formatters.ts`

```typescript
// Format address: 0x1234...5678
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format USD: $1,234.56
export function formatUSD(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

// Format token amount: 1,234.5678 PANBOO
export function formatToken(
  amount: bigint | string,
  symbol: string = '',
  decimals: number = 18
): string {
  const formatted = formatBigNumber(amount, decimals);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

// Format timestamp: "2 hours ago"
export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Format APR: 123.45%
export function formatAPR(apr: number): string {
  return `${apr.toFixed(2)}%`;
}
```

#### c) Calculations

**File**: `src/utils/calculations.ts`

```typescript
// Calculate swap output (with fees)
export function calculateSwapOutput(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  fee: number = 0.25 // 0.25% PancakeSwap fee
): bigint {
  const amountInWithFee = amountIn * BigInt(10000 - fee * 100) / 10000n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn + amountInWithFee;
  return numerator / denominator;
}

// Calculate price impact
export function calculatePriceImpact(
  amountIn: bigint,
  reserveIn: bigint,
  amountOut: bigint,
  reserveOut: bigint
): number {
  const expectedRate = Number(reserveOut) / Number(reserveIn);
  const actualRate = Number(amountOut) / Number(amountIn);
  return ((expectedRate - actualRate) / expectedRate) * 100;
}

// Calculate APR
export function calculateAPR(
  rewardPerBlock: bigint,
  poolAllocPoint: bigint,
  totalAllocPoint: bigint,
  totalStaked: bigint,
  tokenPriceUSD: number,
  lpPriceUSD: number
): number {
  if (totalStaked === 0n) return 0;

  // Rewards per day for this pool
  const blocksPerDay = 28800; // BSC: ~3 sec/block
  const poolRewardPerBlock = (rewardPerBlock * poolAllocPoint) / totalAllocPoint;
  const rewardsPerDay = poolRewardPerBlock * BigInt(blocksPerDay);
  const rewardsValuePerDay = Number(formatUnits(rewardsPerDay, 18)) * tokenPriceUSD;

  // Total value staked
  const stakedValue = Number(formatUnits(totalStaked, 18)) * lpPriceUSD;

  // APR = (daily rewards / staked value) × 365
  return (rewardsValuePerDay / stakedValue) * 365 * 100;
}

// Calculate pending rewards
export function calculatePendingRewards(
  userAmount: bigint,
  totalStaked: bigint,
  accRewardPerShare: bigint,
  rewardDebt: bigint
): bigint {
  if (totalStaked === 0n) return 0n;
  const pending = (userAmount * accRewardPerShare) / 1e12n - rewardDebt;
  return pending > 0n ? pending : 0n;
}
```

---

## Data Flow

### 1. User Swaps PANBOO

```
User clicks "Swap" button
  ↓
Frontend: useSwap hook
  ↓
1. Check if user is on correct chain (useChainReady)
  ↓
2. Check token allowance
  ↓
3. If allowance insufficient:
   → Call approve() on token contract
   → Wait for confirmation
  ↓
4. Call PancakeSwap router.swapExactTokensForTokens()
  ↓
5. PancakeSwap executes swap
  ↓
6. PanbooToken._transfer() called
  ↓
7. Tax calculated (3% buy or 5% sell)
  ↓
8. Tax tokens sent to token contract
  ↓
9. If accumulated tax >= threshold:
   → Auto-swap PANBOO → BNB
   → Send BNB to charity wallet
   → Emit CharityDonation event
  ↓
10. Blockchain listener detects event
  ↓
11. Backend inserts donation to database
  ↓
12. Frontend queries /charity/recent
  ↓
13. Display updated donation stats
```

### 2. User Stakes LP Tokens

```
User enters amount on Farms page
  ↓
Frontend: useFarmActions hook
  ↓
1. Check chain (useChainReady)
  ↓
2. Check LP token allowance for MasterChef
  ↓
3. If needed: approve LP token
  ↓
4. Call MasterChef.deposit(poolId, amount)
  ↓
5. MasterChef updates pool state:
   → Calculate and distribute pending rewards
   → Update accRewardPerShare
   → Transfer LP tokens from user to MasterChef
   → Update user.amount and user.rewardDebt
  ↓
6. Emit Deposit event
  ↓
7. Blockchain listener detects event
  ↓
8. Backend updates user_stakes table
  ↓
9. Frontend queries /farms/user/:address
  ↓
10. Display updated staked amount
```

### 3. Charity Donation Flow

```
Tax Collected During Swap
  ↓
Tokens accumulate in PanbooToken contract
  ↓
When balance >= swapThreshold:
  ↓
1. PanbooToken calls _swapAndDonate()
  ↓
2. Approve tokens to PancakeSwap router
  ↓
3. Swap PANBOO → BNB via PancakeSwap
  ↓
4. Send BNB to charity wallet
  ↓
5. Emit CharityDonation(bnbAmount, tokenAmount)
  ↓
6. Backend listener catches event
  ↓
7. Insert into charity_donations table
  ↓
8. Insert into activity_feed table
  ↓
9. Frontend polls /charity/recent
  ↓
10. Live feed updates
  ↓
11. Chart updates
  ↓
12. Summary stats update
```

---

## Key Features

### 1. Automatic Charity Donations

**How it works**:
- Every swap incurs a tax (3% buy, 5% sell)
- Taxes collected in PANBOO tokens
- When threshold reached (default: 100,000 PANBOO):
  - Auto-swap to BNB via PancakeSwap
  - Send BNB to charity wallet
  - Emit blockchain event
- 100% transparent, verifiable on-chain

**Benefits**:
- Zero user action required
- Every trade helps charity
- Fully auditable
- Real-time tracking

### 2. Yield Farming

**How it works**:
- Add liquidity on PancakeSwap → Get LP tokens
- Stake LP tokens in MasterChef
- Earn PANBOO rewards every block
- Rewards calculated proportionally
- No lock period, withdraw anytime

**APR Calculation**:
```
APR = (Pool Rewards per Day × PANBOO Price × 365) / (Total Staked LP × LP Price)

Example:
- Pool gets 10,000 PNB/day
- PNB price: $0.10
- Daily rewards value: $1,000
- Total staked: $50,000
- APR = ($1,000 × 365) / $50,000 = 730%
```

### 3. Tax Timelock Security

**Purpose**: Prevents rug pulls and sudden tax increases

**How it works**:
1. Owner calls `scheduleTaxRateChange(3%, 5%)`
2. System records timestamp + 24 hours
3. Must wait 24 hours before execution
4. Owner calls `executeTaxRateChange()` after 24h
5. New taxes take effect

**Community Safety**:
- 24-hour warning for any tax change
- Max tax: 10% (hardcoded in contract)
- Can cancel pending changes
- Transparent on-chain

### 4. Live Activity Feed

**Real-time events**:
- Swaps
- Stakes/Unstakes
- Harvests
- Charity donations

**Implementation**:
- Blockchain listener catches events
- Stores in activity_feed table
- Frontend polls /feed/live
- Displays with animations
- Shows last 10-50 events

### 5. Admin Panel

**Owner Controls**:
- Schedule tax changes (24hr timelock)
- Update charity wallet
- Configure auto-swap threshold
- Add/modify farm pools
- Change emission rates
- Exclude addresses from tax
- Emergency circuit breaker
- View backend configuration

**Security**:
- Only callable by contract owner
- Requires wallet signature
- All changes on-chain
- Events emitted for transparency

---

## Configuration

### Environment Variables

**Frontend** (`.env`):
```bash
# Network
VITE_CHAIN_ID=97                    # 97 = BSC Testnet, 56 = BSC Mainnet
VITE_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# Contract Addresses (from deployment)
VITE_TOKEN_ADDRESS=0x4D62931968fd185423cBf4eA029Be4D48C35312E
VITE_MASTERCHEF_ADDRESS=0xD9B2B2288E14D7bE024012289e149a8B9Cf9CfDD
VITE_CHARITY_WALLET=0xb008d3c90e2f6dd63d4a0bd3ad6f6389f333cd1d
VITE_PANBOO_BNB_PAIR=0x89D27Bc3Fb398055F6bDefdd66B259BE60BCa2b2

# API
VITE_API_URL=http://localhost:3002

# WalletConnect (get from https://cloud.walletconnect.com)
VITE_WALLETCONNECT_ID=your_project_id_here

# Features
VITE_ENABLE_LIVE_FEED=true
VITE_ENABLE_FAKE_DATA=false
```

**Backend** (`backend/.env`):
```bash
# Network
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
CHAIN_ID=97

# Contract Addresses
TOKEN_ADDRESS=0x4D62931968fd185423cBf4eA029Be4D48C35312E
MASTERCHEF_ADDRESS=0xD9B2B2288E14D7bE024012289e149a8B9Cf9CfDD
CHARITY_WALLET=0xb008d3c90e2f6dd63d4a0bd3ad6f6389f333cd1d
PANBOO_BNB_PAIR=0x89D27Bc3Fb398055F6bDefdd66B259BE60BCa2b2

# Database (local dev uses file, production uses Turso)
TURSO_URL=file:panboo.db
TURSO_AUTH_TOKEN=

# API Server
PORT=3002
CORS_ORIGIN=*

# Blockchain Listener
POLL_INTERVAL=3600000    # 1 hour in milliseconds
START_BLOCK=0            # 0 = latest block

# Logging
LOG_LEVEL=info           # debug, info, warn, error
```

**Smart Contracts** (`smartcontracts/.env`):
```bash
# Testnet Deployment (private key)
PRIVATE_KEY=0x...your_private_key_here

# Mainnet Deployment (Ledger recommended)
LEDGER_ADDRESS=0x0000000000000000000000000000000000000000

# Contract Config
CHARITY_WALLET=0xb008d3c90e2f6dd63d4a0bd3ad6f6389f333cd1d

# BscScan API (for verification)
BSCSCAN_API_KEY=your_api_key_here

# RPC
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
```

---

## Development Workflow

### Local Development Setup

**1. Clone & Install**:
```bash
cd c:\DEV\panbooweb

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install smart contract dependencies
cd ../smartcontracts
npm install
```

**2. Configure Environment**:
```bash
# Copy and edit .env files
cp .env.example .env
cp backend/.env.example backend/.env
cp smartcontracts/.env.example smartcontracts/.env

# Edit with your values
notepad .env
notepad backend/.env
notepad smartcontracts/.env
```

**3. Start Development**:
```bash
# Option 1: Use start script (Windows)
start-panboo.bat

# Option 2: Manual start
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend
npm start

# Option 3: Both together (with concurrently)
npm run dev:all
```

### Testing Smart Contracts

```bash
cd smartcontracts

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Test coverage
npx hardhat coverage

# Deploy to testnet
npx hardhat run scripts/deploy.js --network bscTestnet

# Verify on BscScan
npx hardhat verify --network bscTestnet CONTRACT_ADDRESS
```

### Building for Production

**Frontend**:
```bash
# Build
npm run build

# Preview build
npm run preview

# Output: dist/ folder
# Deploy dist/ to hosting (Netlify, Vercel, etc.)
```

**Backend**:
```bash
cd backend

# Backend is Node.js, no build needed
# Just deploy source to hosting (Render, Railway, etc.)

# Set environment variables on hosting platform
# Point TURSO_URL to production database
```

**Smart Contracts**:
```bash
cd smartcontracts

# For mainnet deployment:
# 1. Get Ledger hardware wallet
# 2. Fund with BNB
# 3. Update LEDGER_ADDRESS in .env
# 4. Deploy:
npx hardhat run scripts/deploy.js --network bscMainnetLedger

# 5. Verify:
npx hardhat verify --network bscMainnet TOKEN_ADDRESS
```

---

## Common Workflows

### Adding a New Farm Pool

**1. On Blockchain** (Owner only):
```typescript
// Via Admin Panel
1. Navigate to http://localhost:3000/admin
2. Scroll to "Pool Management"
3. Enter LP token address (e.g., BUSD/BNB LP)
4. Enter allocation points (e.g., 1000)
5. Click "Add Pool"
6. Sign transaction
```

**2. Pool becomes available**:
- Backend listener detects AddPool event
- Updates pool_states table
- Frontend fetches /farms/pools
- New pool appears on Farms page

### Updating Tax Rates

**As Owner**:
```typescript
1. Go to Admin Panel
2. Enter new buy tax (e.g., 2.5%)
3. Enter new sell tax (e.g., 4.5%)
4. Click "Schedule Tax Change (24hr)"
5. Sign transaction
6. Wait 24 hours
7. Click "Execute Now"
8. Sign transaction
9. New taxes active
```

**As User**:
```typescript
1. Check Admin Panel or Etherscan
2. See pending tax change
3. Have 24 hours to sell if desired
4. After 24h, new taxes apply
```

### Manual Charity Donation

**Trigger as Owner**:
```typescript
1. Admin Panel → Manual Actions
2. Click "Swap & Donate Now"
3. Sign transaction
4. All accumulated tax tokens swap to BNB
5. BNB sent to charity wallet
6. Event emitted → backend updates → frontend shows
```

### Changing Poll Interval

**Update Backend Polling**:
```typescript
1. Admin Panel → Backend Configuration
2. Enter desired hours (e.g., 0.5 for 30 min)
3. Click "Instructions"
4. Follow displayed steps:
   - Edit backend/.env
   - Set POLL_INTERVAL=value
   - Restart backend
```

---

## Advanced Topics

### 1. Multicall for Batch Reads

**Why**: Reading multiple contract values = multiple RPC calls (slow)

**Solution**: Multicall3 batches reads into 1 call

**Example**:
```typescript
// Without Multicall (4 RPC calls)
const balance = await token.balanceOf(user);
const allowance = await token.allowance(user, spender);
const totalSupply = await token.totalSupply();
const owner = await token.owner();

// With Multicall (1 RPC call)
import { multicall } from 'wagmi';

const results = await multicall({
  contracts: [
    { address: TOKEN, abi: ABI, functionName: 'balanceOf', args: [user] },
    { address: TOKEN, abi: ABI, functionName: 'allowance', args: [user, spender] },
    { address: TOKEN, abi: ABI, functionName: 'totalSupply' },
    { address: TOKEN, abi: ABI, functionName: 'owner' }
  ]
});

const [balance, allowance, totalSupply, owner] = results.map(r => r.result);
```

### 2. Gas Optimization

**Frontend**:
- Use multicall for batch reads
- Cache frequently accessed data (React Query)
- Estimate gas before transactions
- Use gas price from network (don't hardcode)

**Smart Contracts**:
- Use `uint256` instead of smaller types (gas paradox)
- Pack storage variables
- Use `external` instead of `public` where possible
- Avoid loops over unbounded arrays
- Use events instead of storage for historical data
- Mark functions as `view` or `pure` when possible

**Example**:
```solidity
// Bad (loads from storage multiple times)
function badTransfer() external {
    require(balanceOf[msg.sender] >= 100); // Load 1
    balanceOf[msg.sender] -= 100;          // Load 2, Store 1
    balanceOf[recipient] += 100;           // Load 3, Store 2
}

// Good (cache in memory)
function goodTransfer() external {
    uint256 senderBalance = balanceOf[msg.sender]; // Load 1
    require(senderBalance >= 100);
    balanceOf[msg.sender] = senderBalance - 100;   // Store 1
    balanceOf[recipient] += 100;                   // Load 2, Store 2
}
```

### 3. Error Handling

**Smart Contracts**:
```solidity
// Use custom errors (cheaper gas than strings)
error InsufficientBalance(uint256 available, uint256 required);
error Unauthorized();
error InvalidAddress();

function transfer(address to, uint256 amount) external {
    if (to == address(0)) revert InvalidAddress();
    if (balanceOf[msg.sender] < amount) {
        revert InsufficientBalance(balanceOf[msg.sender], amount);
    }
    // ...
}
```

**Frontend**:
```typescript
try {
  const hash = await writeContractAsync({ ... });
  toast.success('Transaction submitted!');
} catch (error: any) {
  // User rejected
  if (error.code === 4001) {
    toast.error('Transaction cancelled');
    return;
  }

  // Insufficient funds
  if (error.message?.includes('insufficient funds')) {
    toast.error('Insufficient BNB for gas');
    return;
  }

  // Custom contract error
  if (error.message?.includes('InsufficientBalance')) {
    toast.error('Insufficient token balance');
    return;
  }

  // Generic error
  toast.error(error.message || 'Transaction failed');
}
```

**Backend**:
```javascript
// Always wrap async operations
try {
  const result = await riskyOperation();
  logger.info('Success', { result });
} catch (error) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack
  });
  // Don't crash, continue processing
}
```

### 4. Security Best Practices

**Smart Contracts**:
- ✅ Use OpenZeppelin contracts
- ✅ Implement timelock for critical functions
- ✅ Add max limits (max tax = 10%)
- ✅ Use `nonReentrant` modifier on transfers
- ✅ Validate all inputs
- ✅ Emit events for all state changes
- ✅ Have emergency pause mechanism
- ⛔ Never store private keys in code
- ⛔ Never trust user input
- ⛔ Never use `tx.origin` for auth

**Frontend**:
- ✅ Validate user input
- ✅ Check allowances before transfers
- ✅ Estimate gas before transactions
- ✅ Use HTTPS only
- ✅ Validate contract addresses
- ⛔ Never store private keys
- ⛔ Don't trust blockchain data blindly
- ⛔ Don't expose sensitive data in localStorage

**Backend**:
- ✅ Use environment variables
- ✅ Validate all inputs
- ✅ Use parameterized queries (SQL injection protection)
- ✅ Rate limit API endpoints
- ✅ Log all errors
- ⛔ Never commit .env files
- ⛔ Don't expose internal errors to users
- ⛔ Don't trust frontend data

---

## Troubleshooting Guide

### Issue: "Access Denied" on Admin Page

**Cause**: Not connected as contract owner

**Solution**:
1. Check which wallet is connected
2. Read contract owner: `token.owner()`
3. Connect with owner wallet
4. Must be on correct chain (testnet/mainnet)

---

### Issue: Transaction Fails with "Insufficient Allowance"

**Cause**: Contract doesn't have permission to spend your tokens

**Solution**:
```typescript
1. Call approve first:
   token.approve(spenderAddress, amount)

2. Wait for approval to confirm

3. Then execute main transaction
```

---

### Issue: Swap Fails with "K"

**Cause**: PancakeSwap constant product formula violated

**Solution**:
- Reduce swap amount (too much slippage)
- Increase slippage tolerance
- Wait for liquidity to increase

---

### Issue: "Wrong Network" Error

**Cause**: Wallet on different chain than app expects

**Solution**:
```typescript
1. Check ENV.CHAIN_ID in .env
2. Switch wallet to matching chain:
   - 56 = BSC Mainnet
   - 97 = BSC Testnet
3. App should auto-detect and prompt switch
```

---

### Issue: Backend Not Syncing Events

**Cause**: RPC rate limits or wrong config

**Solution**:
1. Check backend logs for errors
2. Verify RPC_URL is correct
3. Increase POLL_INTERVAL (reduce API calls)
4. Use better RPC provider (QuickNode, Ankr)
5. Check contract addresses match deployment

---

### Issue: APR Shows 0%

**Cause**: Missing price data or no stakers

**Solution**:
1. Check if price service is working
2. Verify LP reserves exist
3. If first staker, APR needs time to calculate
4. Check PANBOO/BNB pair has liquidity

---

### Issue: Can't See Admin Link

**Cause**: Not detected as owner

**Solution**:
```typescript
1. Open browser console (F12)
2. Run: localStorage.clear()
3. Refresh page
4. Reconnect wallet as owner
5. Check you're on correct chain
```

---

## Performance Optimization

### Frontend Optimizations

**1. Code Splitting**:
```typescript
// Lazy load pages
const Farms = lazy(() => import('./pages/Farms'));
const Admin = lazy(() => import('./pages/Admin'));

<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/farms" element={<Farms />} />
    <Route path="/admin" element={<Admin />} />
  </Routes>
</Suspense>
```

**2. React Query Caching**:
```typescript
// Cache data for 30 seconds, refetch every minute
useQuery({
  queryKey: ['charity', 'summary'],
  queryFn: fetchCharitySummary,
  staleTime: 30_000,
  cacheTime: 300_000,
  refetchInterval: 60_000
});
```

**3. Memoization**:
```typescript
// Expensive calculations
const apr = useMemo(() =>
  calculateAPR(rewardPerBlock, allocPoint, totalAlloc, totalStaked, prices),
  [rewardPerBlock, allocPoint, totalAlloc, totalStaked, prices]
);

// Callbacks
const handleStake = useCallback(async (amount) => {
  // ...
}, [poolId]);
```

### Backend Optimizations

**1. Database Indexes**:
```sql
CREATE INDEX idx_charity_timestamp ON charity_donations(timestamp DESC);
CREATE INDEX idx_activity_timestamp ON activity_feed(timestamp DESC);
CREATE INDEX idx_user_stakes ON user_stakes(user_address, pool_id);
```

**2. Batch Processing**:
```javascript
// Process blocks in batches of 100
const BATCH_SIZE = 100;
for (let i = fromBlock; i <= toBlock; i += BATCH_SIZE) {
  const events = await getEvents(i, Math.min(i + BATCH_SIZE, toBlock));
  await processBatch(events);
}
```

**3. Connection Pooling**:
```javascript
// Reuse database connections
const pool = createConnectionPool({
  max: 10,
  min: 2,
  idle: 30000
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Smart contracts audited
- [ ] Security review completed
- [ ] Gas costs optimized
- [ ] Environment variables set
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] Error tracking enabled (Sentry)
- [ ] Rate limiting configured
- [ ] SSL/HTTPS enabled

### Smart Contract Deployment

- [ ] Compile contracts
- [ ] Deploy to testnet first
- [ ] Test all functions on testnet
- [ ] Verify contracts on BscScan
- [ ] Fund deployer wallet with BNB
- [ ] Use Ledger for mainnet
- [ ] Deploy to mainnet
- [ ] Verify on BscScan
- [ ] Add liquidity on PancakeSwap
- [ ] Create initial farm pool
- [ ] Test swap, stake, withdraw
- [ ] Update .env files with addresses

### Backend Deployment

- [ ] Choose hosting (Render, Railway, Fly.io)
- [ ] Set up Turso database
- [ ] Configure environment variables
- [ ] Deploy backend
- [ ] Test API endpoints
- [ ] Verify event syncing
- [ ] Set up logging
- [ ] Configure alerts
- [ ] Test with frontend

### Frontend Deployment

- [ ] Update .env with production values
- [ ] Build: `npm run build`
- [ ] Test build locally: `npm run preview`
- [ ] Deploy to hosting (Netlify, Vercel)
- [ ] Configure custom domain
- [ ] Enable HTTPS
- [ ] Test all pages
- [ ] Test wallet connection
- [ ] Test transactions
- [ ] Verify analytics

### Post-Deployment

- [ ] Monitor logs for errors
- [ ] Check blockchain listener is syncing
- [ ] Verify charity donations working
- [ ] Test farm pools
- [ ] Monitor gas costs
- [ ] Set up uptime monitoring
- [ ] Create backup plan
- [ ] Document for team
- [ ] Announce to community

---

## Conclusion

This codebase implements a complete DeFi ecosystem with:

**Smart Contracts**:
- ERC20 token with charity tax system
- MasterChef for yield farming
- Security features (timelock, max limits)

**Backend**:
- Event indexing and caching
- REST API for historical data
- Price fetching and calculation

**Frontend**:
- Modern React app with TypeScript
- Web3 integration with wagmi
- Real-time data updates
- Admin controls

**Key Innovations**:
- Automatic charity donations
- 24-hour tax timelock
- Transparent on-chain tracking
- Yield farming rewards
- Live activity feed

**Security Focus**:
- OpenZeppelin contracts
- Timelock protection
- Max limits hardcoded
- Emergency pause
- Ledger for mainnet

**User Experience**:
- One-click wallet connection
- Real-time price updates
- Automatic chain switching
- Clear error messages
- Responsive design

Study each section thoroughly and you'll understand the complete architecture and be able to extend or modify the platform.

Happy learning! ✈️
