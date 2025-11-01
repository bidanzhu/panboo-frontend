// Generic ERC-20 ABI
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

// PancakeSwap Pair ABI (simplified)
export const PAIR_ABI = [
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'event Sync(uint112 reserve0, uint112 reserve1)',
] as const;

// PancakeSwap Router ABI (simplified)
export const ROUTER_ABI = [
  'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)',
  'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable',
  'function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)',
] as const;

// MasterChef ABI
export const MASTERCHEF_ABI = [
  // View functions
  'function owner() view returns (address)',
  'function poolLength() view returns (uint256)',
  'function poolInfo(uint256 pid) view returns (address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accRewardPerShare, uint256 totalStaked)',
  'function userInfo(uint256 pid, address user) view returns (uint256 amount, uint256 rewardDebt, uint256 pendingRewards)',
  'function pendingReward(uint256 pid, address user) view returns (uint256)',
  'function rewardPerBlock() view returns (uint256)',
  'function totalAllocPoint() view returns (uint256)',
  'function startBlock() view returns (uint256)',
  'function MAX_POOLS() view returns (uint256)',
  'function MAX_REWARD_PER_BLOCK() view returns (uint256)',
  'function minStakeAmount() view returns (uint256)',

  // State-changing functions
  'function deposit(uint256 pid, uint256 amount)',
  'function withdraw(uint256 pid, uint256 amount)',
  'function harvest(uint256 pid)',
  'function emergencyWithdraw(uint256 pid)',

  // Owner functions
  'function add(uint256 allocPoint, address lpToken, bool withUpdate)',
  'function set(uint256 pid, uint256 allocPoint, bool withUpdate)',
  'function updateEmissionRate(uint256 _rewardPerBlock)',
  'function setMinStakeAmount(uint256 _minStakeAmount)',
  'function recoverToken(address token, uint256 amount)',

  // Events
  'event Deposit(address indexed user, uint256 indexed pid, uint256 amount)',
  'event Withdraw(address indexed user, uint256 indexed pid, uint256 amount)',
  'event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount)',
  'event Harvest(address indexed user, uint256 indexed pid, uint256 amount, uint256 carry)',
  'event PoolAdded(uint256 indexed pid, address indexed lpToken, uint256 allocPoint)',
  'event PoolUpdated(uint256 indexed pid, uint256 allocPoint)',
  'event EmissionRateUpdated(address indexed caller, uint256 previousRate, uint256 newRate)',
  'event TokenRecovered(address indexed token, uint256 amount)',
  'event MinStakeAmountUpdated(uint256 newAmount)',
] as const;

// Panboo Token ABI (BEP-20 with tax features)
export const PANBOO_TOKEN_ABI = [
  ...ERC20_ABI,

  // Ownable
  'function owner() view returns (address)',

  // Tax-related view functions
  'function buyTaxBps() view returns (uint256)',
  'function sellTaxBps() view returns (uint256)',
  'function swapThreshold() view returns (uint256)',
  'function swapEnabled() view returns (bool)',
  'function charityWallet() view returns (address)',
  'function pancakeRouter() view returns (address)',
  'function pancakePair() view returns (address)',
  'function isExcludedFromTax(address account) view returns (bool)',

  // Tax timelock view functions
  'function hasPendingTaxChange() view returns (bool)',
  'function pendingBuyTaxBps() view returns (uint256)',
  'function pendingSellTaxBps() view returns (uint256)',
  'function taxChangeTimestamp() view returns (uint256)',
  'function TAX_CHANGE_DELAY() view returns (uint256)',

  // Multi-AMM pair support
  'function isAMMPair(address pair) view returns (bool)',
  'function setAMMPair(address pair, bool value)',

  // MEV protection
  'function maxSwapBps() view returns (uint256)',
  'function calculateMaxSwapAmount() view returns (uint256)',
  'function setMaxSwapBps(uint256 newMaxSwapBps)',

  // Anti-dust & rate limiting
  'function minDonationBNB() view returns (uint256)',
  'function lastAutoSwapBlock() view returns (uint256)',
  'function setMinDonationBNB(uint256 newMin)',

  // Trading circuit breaker
  'function tradingEnabled() view returns (bool)',
  'function setTradingEnabled(bool enabled)',

  // Admin functions - Tax management (with timelock)
  'function scheduleTaxRateChange(uint256 newBuyTax, uint256 newSellTax)',
  'function executeTaxRateChange()',
  'function cancelTaxRateChange()',

  // Admin functions - Other
  'function setSwapThreshold(uint256 newThreshold)',
  'function setSwapEnabled(bool enabled)',
  'function setCharityWallet(address newWallet)',
  'function setExcludedFromTax(address account, bool excluded)',
  'function manualSwapAndDonate()',
  'function setPrimaryPair(address pair)',
  'function setRouter(address newRouter)',

  // Events
  'event Donated(uint256 tokensSold, uint256 bnbSent, address indexed to, uint256 timestamp)',
  'event TaxCollected(address indexed from, address indexed pair, uint256 amount, bool isSell)',
  'event SwapThresholdUpdated(uint256 newThreshold)',
  'event SwapEnabledUpdated(bool enabled)',
  'event CharityWalletUpdated(address indexed newWallet)',
  'event TaxRatesUpdated(uint256 buyTax, uint256 sellTax)',
  'event TaxChangeScheduled(uint256 newBuyTax, uint256 newSellTax, uint256 executeAfter)',
  'event TaxChangeCancelled()',
  'event AMMPairUpdated(address indexed pair, bool value)',
  'event MaxSwapBpsUpdated(uint256 newMaxSwapBps)',
  'event MinDonationUpdated(uint256 newMinDonation)',
  'event DonationSkipped(uint256 bnbAmount, uint256 minRequired)',
  'event RouterUpdated(address indexed newRouter)',
  'event PrimaryPairUpdated(address indexed newPair)',
  'event TradingEnabledSet(bool enabled)',
] as const;

// Multicall3 ABI
export const MULTICALL3_ABI = [
  'function aggregate(tuple(address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes[] returnData)',
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)',
  'function aggregate3Value(tuple(address target, bool allowFailure, uint256 value, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)',
  'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)',
] as const;

// Type exports for better TypeScript support
export type ERC20ABI = typeof ERC20_ABI;
export type PairABI = typeof PAIR_ABI;
export type RouterABI = typeof ROUTER_ABI;
export type MasterChefABI = typeof MASTERCHEF_ABI;
export type PanbooTokenABI = typeof PANBOO_TOKEN_ABI;
export type Multicall3ABI = typeof MULTICALL3_ABI;
