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
  'function poolLength() view returns (uint256)',
  'function poolInfo(uint256 pid) view returns (address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accRewardPerShare)',
  'function userInfo(uint256 pid, address user) view returns (uint256 amount, uint256 rewardDebt)',
  'function pending Reward(uint256 pid, address user) view returns (uint256)',
  'function rewardPerBlock() view returns (uint256)',
  'function totalAllocPoint() view returns (uint256)',
  'function startBlock() view returns (uint256)',

  // State-changing functions
  'function deposit(uint256 pid, uint256 amount)',
  'function withdraw(uint256 pid, uint256 amount)',
  'function emergencyWithdraw(uint256 pid)',

  // Owner functions
  'function add(uint256 allocPoint, address lpToken, bool withUpdate)',
  'function set(uint256 pid, uint256 allocPoint, bool withUpdate)',
  'function updateEmissionRate(uint256 _rewardPerBlock)',

  // Events
  'event Deposit(address indexed user, uint256 indexed pid, uint256 amount)',
  'event Withdraw(address indexed user, uint256 indexed pid, uint256 amount)',
  'event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount)',
  'event Harvest(address indexed user, uint256 indexed pid, uint256 amount)',
  'event PoolAdded(uint256 indexed pid, address indexed lpToken, uint256 allocPoint)',
  'event EmissionRateUpdated(uint256 oldRate, uint256 newRate)',
] as const;

// Panboo Token ABI (BEP-20 with tax features)
export const PANBOO_TOKEN_ABI = [
  ...ERC20_ABI,

  // Tax-related view functions
  'function buyTax() view returns (uint256)',
  'function sellTax() view returns (uint256)',
  'function isExcludedFromFees(address account) view returns (bool)',
  'function charityWallet() view returns (address)',
  'function swapThreshold() view returns (uint256)',

  // Events
  'event Donated(uint256 tokensSold, uint256 bnbSent, address indexed to, uint256 timestamp)',
  'event TaxCollected(address indexed from, address indexed pair, uint256 amount, bool isSell)',
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
