// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MasterChef
 * @dev Staking contract for LP tokens with PANBOO rewards
 *
 * Features:
 * - Multiple staking pools
 * - Configurable reward emission rate
 * - Deposit, withdraw, and harvest functions
 * - Emergency withdraw (forfeit rewards)
 * - Pending rewards calculation
 */
contract MasterChef is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Accumulated rewards precision
    uint256 private constant ACC_PRECISION = 1e12;

    // Maximum number of pools to prevent gas issues in massUpdatePools
    uint256 public constant MAX_POOLS = 50;

    // Maximum emission rate to prevent owner abuse (100 tokens per block = 2.88M per day on BSC)
    uint256 public constant MAX_REWARD_PER_BLOCK = 100 * 10**18;

    // Minimum stake amount to prevent dust attacks
    uint256 public minStakeAmount = 1000; // 1000 wei minimum (configurable)

    // Info of each user
    struct UserInfo {
        uint256 amount;        // How many LP tokens the user has provided
        uint256 rewardDebt;    // Reward debt (see explanation below)
        uint256 pendingRewards; // Pending rewards waiting to be claimed
    }

    // Info of each pool
    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract
        uint256 allocPoint;       // Allocation points assigned to this pool
        uint256 lastRewardBlock;  // Last block number that reward distribution occurred
        uint256 accRewardPerShare; // Accumulated rewards per share, times ACC_PRECISION
        uint256 totalStaked;      // Total LP tokens staked in this pool
    }

    // The reward token (PANBOO)
    IERC20 public rewardToken;

    // Reward tokens per block
    uint256 public rewardPerBlock;

    // Info of each pool
    PoolInfo[] public poolInfo;

    // Info of each user that stakes LP tokens
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    // Total allocation points (sum of all pools)
    uint256 public totalAllocPoint = 0;

    // The block number when reward mining starts
    uint256 public startBlock;

    // Events
    event PoolAdded(
        uint256 indexed pid,
        address indexed lpToken,
        uint256 allocPoint
    );

    event PoolUpdated(
        uint256 indexed pid,
        uint256 allocPoint
    );

    event Deposit(
        address indexed user,
        uint256 indexed pid,
        uint256 amount
    );

    event Withdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount
    );

    event Harvest(
        address indexed user,
        uint256 indexed pid,
        uint256 amount,
        uint256 carry
    );

    event EmergencyWithdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount
    );

    event EmissionRateUpdated(
        address indexed caller,
        uint256 previousRate,
        uint256 newRate
    );

    event TokenRecovered(
        address indexed token,
        uint256 amount
    );

    event MinStakeAmountUpdated(uint256 newAmount);

    constructor(
        IERC20 _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock
    ) Ownable(msg.sender) {
        require(address(_rewardToken) != address(0), "Reward token cannot be zero address");
        require(_rewardPerBlock > 0, "Reward per block must be > 0");
        require(_rewardPerBlock <= MAX_REWARD_PER_BLOCK, "Emission rate too high");

        rewardToken = _rewardToken;
        rewardPerBlock = _rewardPerBlock;
        startBlock = _startBlock;
    }

    /**
     * @dev Returns number of pools
     */
    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    /**
     * @dev Add a new LP pool (owner only)
     */
    function add(
        uint256 _allocPoint,
        IERC20 _lpToken,
        bool _withUpdate
    ) external onlyOwner {
        require(poolInfo.length < MAX_POOLS, "Maximum pools reached");
        require(_lpToken != rewardToken, "LP cannot be reward token");

        // Prevent duplicate pools
        for (uint256 i = 0; i < poolInfo.length; i++) {
            require(address(poolInfo[i].lpToken) != address(_lpToken), "Pool already exists");
        }

        if (_withUpdate) {
            massUpdatePools();
        }

        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint += _allocPoint;

        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accRewardPerShare: 0,
            totalStaked: 0
        }));

        emit PoolAdded(poolInfo.length - 1, address(_lpToken), _allocPoint);
    }

    /**
     * @dev Update allocation point of a pool (owner only)
     */
    function set(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) external onlyOwner {
        require(_pid < poolInfo.length, "Invalid pool ID");

        if (_withUpdate) {
            massUpdatePools();
        }

        totalAllocPoint = totalAllocPoint - poolInfo[_pid].allocPoint + _allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;

        emit PoolUpdated(_pid, _allocPoint);
    }

    /**
     * @dev Return reward multiplier over the given _from to _to block
     */
    function getMultiplier(uint256 _from, uint256 _to) public pure returns (uint256) {
        return _to - _from;
    }

    /**
     * @dev View function to see pending rewards on frontend
     */
    function pendingReward(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accRewardPerShare = pool.accRewardPerShare;
        uint256 lpSupply = pool.totalStaked;

        if (block.number > pool.lastRewardBlock && lpSupply != 0 && totalAllocPoint != 0 && pool.allocPoint != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 reward = (multiplier * rewardPerBlock * pool.allocPoint) / totalAllocPoint;
            accRewardPerShare += (reward * ACC_PRECISION) / lpSupply;
        }

        return ((user.amount * accRewardPerShare) / ACC_PRECISION) - user.rewardDebt + user.pendingRewards;
    }

    /**
     * @dev Update reward variables for all pools
     */
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    /**
     * @dev Update reward variables of the given pool
     */
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];

        if (block.number <= pool.lastRewardBlock) {
            return;
        }

        uint256 lpSupply = pool.totalStaked;

        if (lpSupply == 0 || pool.allocPoint == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }

        // Prevent division by zero if all pools are disabled
        if (totalAllocPoint == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }

        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 reward = (multiplier * rewardPerBlock * pool.allocPoint) / totalAllocPoint;

        pool.accRewardPerShare += (reward * ACC_PRECISION) / lpSupply;
        pool.lastRewardBlock = block.number;
    }

    /**
     * @dev Deposit LP tokens to MasterChef for reward allocation
     */
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        updatePool(_pid);

        if (user.amount > 0) {
            uint256 pending = ((user.amount * pool.accRewardPerShare) / ACC_PRECISION) - user.rewardDebt;
            if (pending > 0) {
                user.pendingRewards += pending;
            }
        }

        if (_amount > 0) {
            require(_amount >= minStakeAmount, "Below minimum stake");

            // Use balance-delta accounting to handle fee-on-transfer tokens
            uint256 before = pool.lpToken.balanceOf(address(this));
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            uint256 received = pool.lpToken.balanceOf(address(this)) - before;

            require(received >= minStakeAmount, "Received amount too small");
            user.amount += received;
            pool.totalStaked += received;
        }

        user.rewardDebt = (user.amount * pool.accRewardPerShare) / ACC_PRECISION;

        emit Deposit(msg.sender, _pid, _amount);
    }

    /**
     * @dev Withdraw LP tokens from MasterChef
     */
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        require(user.amount >= _amount, "Withdraw: insufficient balance");

        updatePool(_pid);

        uint256 pending = ((user.amount * pool.accRewardPerShare) / ACC_PRECISION) - user.rewardDebt;
        if (pending > 0) {
            user.pendingRewards += pending;
        }

        uint256 sent = 0;
        if (_amount > 0) {
            // Use balance-delta accounting to handle fee-on-transfer tokens
            uint256 before = pool.lpToken.balanceOf(address(this));
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
            sent = before - pool.lpToken.balanceOf(address(this));
            require(sent > 0, "Withdraw: token didn't transfer");

            // Account by what actually left the contract
            user.amount -= sent;
            pool.totalStaked -= sent;
        }

        user.rewardDebt = (user.amount * pool.accRewardPerShare) / ACC_PRECISION;

        emit Withdraw(msg.sender, _pid, sent);
    }

    /**
     * @dev Harvest accumulated rewards
     */
    function harvest(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        updatePool(_pid);

        uint256 pending = ((user.amount * pool.accRewardPerShare) / ACC_PRECISION) - user.rewardDebt;
        uint256 totalPending = pending + user.pendingRewards;

        if (totalPending > 0) {
            // Handle underfunded scenario: only pay what's available, carry forward the rest
            uint256 bal = rewardToken.balanceOf(address(this));
            uint256 payout = totalPending > bal ? bal : totalPending;
            uint256 carry = totalPending - payout;

            if (payout > 0) {
                rewardToken.safeTransfer(msg.sender, payout);
            }
            user.pendingRewards = carry; // Keep unpaid amount for next harvest
            emit Harvest(msg.sender, _pid, payout, carry);
        } else {
            emit Harvest(msg.sender, _pid, 0, 0);
        }

        user.rewardDebt = (user.amount * pool.accRewardPerShare) / ACC_PRECISION;
    }

    /**
     * @dev Withdraw without caring about rewards (emergency only)
     */
    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 amount = user.amount;

        user.amount = 0;
        user.rewardDebt = 0;
        user.pendingRewards = 0;
        pool.totalStaked -= amount;

        pool.lpToken.safeTransfer(address(msg.sender), amount);

        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }

    /**
     * @dev Update emission rate (owner only)
     */
    function updateEmissionRate(uint256 _rewardPerBlock) external onlyOwner {
        require(_rewardPerBlock <= MAX_REWARD_PER_BLOCK, "Emission rate too high");
        massUpdatePools();
        uint256 oldRate = rewardPerBlock;
        rewardPerBlock = _rewardPerBlock;
        emit EmissionRateUpdated(msg.sender, oldRate, _rewardPerBlock);
    }

    /**
     * @dev Helper to calculate total staked amount for a given token across all pools
     */
    function _stakedForToken(IERC20 _token) internal view returns (uint256 total) {
        for (uint256 i = 0; i < poolInfo.length; ++i) {
            if (address(poolInfo[i].lpToken) == address(_token)) {
                total += poolInfo[i].totalStaked;
            }
        }
    }

    /**
     * @dev Update minimum stake amount (owner only)
     */
    function setMinStakeAmount(uint256 _minStakeAmount) external onlyOwner {
        minStakeAmount = _minStakeAmount;
        emit MinStakeAmountUpdated(_minStakeAmount);
    }

    /**
     * @dev Emergency function to recover stuck tokens (owner only)
     * @notice Can only recover tokens that are not staked in any pool
     */
    function recoverToken(IERC20 _token, uint256 _amount) external onlyOwner {
        require(_token != rewardToken, "Cannot recover reward token");

        // Disallow recovering any configured LP token
        for (uint256 i = 0; i < poolInfo.length; ++i) {
            require(_token != poolInfo[i].lpToken, "Cannot recover LP tokens");
        }

        // Calculate excess (balance - total staked)
        uint256 bal = _token.balanceOf(address(this));
        uint256 staked = _stakedForToken(_token);
        uint256 excess = bal > staked ? (bal - staked) : 0;

        require(_amount <= excess, "Exceeds excess");
        _token.safeTransfer(msg.sender, _amount);
        emit TokenRecovered(address(_token), _amount);
    }
}
