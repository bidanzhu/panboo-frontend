// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPancakeRouter02 {
    function WETH() external pure returns (address);
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
}

interface IPancakeFactory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

/**
 * @title PanbooToken
 * @dev BEP-20 token with automatic charity donations on every trade
 *
 * Features:
 * - 3% buy tax, 7% sell tax (configurable with timelock)
 * - Multi-AMM pair support (PNB/BNB, PNB/USDT, etc.)
 * - Tax accumulates in contract buffer
 * - Automatic swap & donate when threshold reached
 * - Max swap amount limit (MEV protection)
 * - 24hr timelock on tax changes
 * - Reentrancy protected
 * - Owner can trigger manual donations
 */
contract PanbooToken is ERC20, Ownable, ReentrancyGuard {
    // Tax rates (in basis points: 100 = 1%)
    uint256 public buyTaxBps = 300;  // 3%
    uint256 public sellTaxBps = 700; // 7%

    // Tax change timelock (24 hours)
    uint256 public constant TAX_CHANGE_DELAY = 24 hours;
    uint256 public constant MIN_TAX_BPS = 100; // Minimum 1% to ensure charity mechanism
    uint256 public pendingBuyTaxBps;
    uint256 public pendingSellTaxBps;
    uint256 public taxChangeTimestamp;
    bool public hasPendingTaxChange;

    // Swap settings
    uint256 public swapThreshold = 100_000 * 10**18; // 100k tokens
    bool public swapEnabled = true;
    bool private inSwap;

    // Max swap amount (0.3% of LP reserves to prevent MEV)
    uint256 public maxSwapBps = 30; // 0.3% in basis points

    // Minimum BNB amount to trigger donation (anti-dust)
    uint256 public minDonationBNB = 0.05 ether; // 0.05 BNB minimum

    // Slippage protection (in basis points: 100 = 1%)
    uint256 public slippageToleranceBps = 200; // 2% slippage tolerance

    // Rate limiting for auto-swaps
    uint256 public lastAutoSwapBlock;

    // Addresses
    address public charityWallet;
    address public pancakeRouter;
    address public pancakePair; // Primary PNB/BNB pair (used for max swap calculation)
    address public immutable pancakeFactory; // Immutable factory address

    // Multi-AMM pair support
    mapping(address => bool) public isAMMPair;

    // Tax exclusions
    mapping(address => bool) public isExcludedFromTax;

    // Trading circuit breaker
    bool public tradingEnabled = true;

    // Events
    event Donated(
        uint256 tokensSold,
        uint256 bnbSent,
        address indexed to,
        uint256 timestamp
    );

    event TaxCollected(
        address indexed from,
        address indexed pair,
        uint256 amount,
        bool isSell
    );

    event SwapThresholdUpdated(uint256 newThreshold);
    event SwapEnabledUpdated(bool enabled);
    event CharityWalletUpdated(address indexed newWallet);
    event TaxRatesUpdated(uint256 buyTax, uint256 sellTax);
    event TaxChangeScheduled(uint256 newBuyTax, uint256 newSellTax, uint256 executeAfter);
    event TaxChangeCancelled();
    event AMMPairUpdated(address indexed pair, bool value);
    event MaxSwapBpsUpdated(uint256 newMaxSwapBps);
    event MinDonationUpdated(uint256 newMinDonation);
    event DonationSkipped(uint256 bnbAmount, uint256 minRequired);
    event RouterUpdated(address indexed newRouter);
    event PrimaryPairUpdated(address indexed newPair);
    event TradingEnabledSet(bool enabled);
    event SlippageToleranceUpdated(uint256 newSlippageBps);

    modifier lockTheSwap {
        inSwap = true;
        _;
        inSwap = false;
    }

    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        address _charityWallet,
        address _pancakeRouter,
        address _pancakeFactory
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(_charityWallet != address(0), "Charity wallet cannot be zero address");
        require(_pancakeRouter != address(0), "Router cannot be zero address");
        require(_pancakeFactory != address(0), "Factory cannot be zero address");
        require(_isContract(_charityWallet) == false, "Charity wallet cannot be contract");

        charityWallet = _charityWallet;
        pancakeRouter = _pancakeRouter;
        pancakeFactory = _pancakeFactory;

        // Create PancakeSwap pair
        address wbnb = IPancakeRouter02(_pancakeRouter).WETH();
        pancakePair = IPancakeFactory(_pancakeFactory).createPair(address(this), wbnb);

        // Mark primary pair as AMM pair
        isAMMPair[pancakePair] = true;

        // Exclude from tax
        isExcludedFromTax[msg.sender] = true;
        isExcludedFromTax[address(this)] = true;
        isExcludedFromTax[_charityWallet] = true;

        // Mint initial supply to deployer
        _mint(msg.sender, totalSupply);
    }

    /**
     * @dev Check if address is a contract
     */
    function _isContract(address account) private view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    /**
     * @dev Override transfer to implement tax mechanism
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override {
        // Skip tax during swaps to prevent recursive calls
        if (inSwap) {
            super._update(from, to, amount);
            return;
        }

        // Circuit breaker: if trading disabled, skip all tax & autoswap logic
        if (!tradingEnabled) {
            super._update(from, to, amount);
            return;
        }

        // Check if we should swap accumulated taxes
        uint256 contractBalance = balanceOf(address(this));
        bool canSwap = contractBalance >= swapThreshold;

        if (
            canSwap &&
            swapEnabled &&
            !isAMMPair[from] && // Don't swap during buys
            !isExcludedFromTax[from] &&
            !isExcludedFromTax[to]
        ) {
            swapAndDonate(contractBalance);
        }

        // Calculate tax
        uint256 taxAmount = 0;
        bool isBuy = isAMMPair[from];
        bool isSell = isAMMPair[to];

        if (!isExcludedFromTax[from] && !isExcludedFromTax[to]) {
            if (isBuy) {
                taxAmount = (amount * buyTaxBps) / 10000;
                emit TaxCollected(from, from, taxAmount, false);
            } else if (isSell) {
                taxAmount = (amount * sellTaxBps) / 10000;
                emit TaxCollected(from, to, taxAmount, true);
            }
        }

        if (taxAmount > 0) {
            super._update(from, address(this), taxAmount);
            amount -= taxAmount;
        }

        super._update(from, to, amount);
    }

    /**
     * @notice Swaps accumulated tax tokens for BNB and donates to charity
     * @dev Protected by reentrancy guard and swap lock. Includes MEV protection via maxSwapBps
     * @param tokenAmount Amount of tokens to swap (will be capped at calculateMaxSwapAmount())
     *
     * Requirements:
     * - tokenAmount must be > 0
     * - Contract must have sufficient token balance
     * - Non-owner calls are rate-limited to 1 per block
     * - Slippage protection applied via _calculateMinBNBOutput()
     *
     * Emits: {Donated} event with swap details
     */
    function swapAndDonate(uint256 tokenAmount) public nonReentrant lockTheSwap {
        require(tokenAmount > 0, "No tokens to swap");
        require(tokenAmount <= balanceOf(address(this)), "Insufficient balance");

        // Rate limit auto-swaps (owner can bypass)
        if (msg.sender != owner()) {
            require(block.number > lastAutoSwapBlock, "Swap throttled");
            lastAutoSwapBlock = block.number;
        }

        // Calculate max swap amount based on LP reserves
        uint256 maxSwapAmount = calculateMaxSwapAmount();
        if (maxSwapAmount > 0 && tokenAmount > maxSwapAmount) {
            tokenAmount = maxSwapAmount;
        }

        // Prepare swap path
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = IPancakeRouter02(pancakeRouter).WETH();

        // Approve router (use max allowance for gas efficiency)
        uint256 currentAllowance = allowance(address(this), pancakeRouter);
        if (currentAllowance < tokenAmount) {
            _approve(address(this), pancakeRouter, type(uint256).max);
        }

        // Calculate minimum expected BNB output with slippage protection
        uint256 minBNBOutput = _calculateMinBNBOutput(tokenAmount);

        // Record BNB before swap
        uint256 initialBalance = address(this).balance;

        // Swap tokens for BNB with slippage protection
        IPancakeRouter02(pancakeRouter).swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            minBNBOutput, // Minimum acceptable output (slippage protected)
            path,
            address(this),
            block.timestamp + 300
        );

        // Calculate BNB received
        uint256 bnbReceived = address(this).balance - initialBalance;

        // Send BNB to charity (only if above minimum)
        if (bnbReceived >= minDonationBNB) {
            (bool success, ) = charityWallet.call{value: bnbReceived}("");
            require(success, "BNB transfer failed");

            emit Donated(tokenAmount, bnbReceived, charityWallet, block.timestamp);
        } else if (bnbReceived > 0) {
            // Skip donation, keep BNB in contract for next time
            emit DonationSkipped(bnbReceived, minDonationBNB);
        }
    }

    /**
     * @dev Calculate minimum BNB output for swap with slippage protection
     */
    function _calculateMinBNBOutput(uint256 tokenAmount) private view returns (uint256) {
        try IPancakePair(pancakePair).getReserves() returns (
            uint112 reserve0,
            uint112 reserve1,
            uint32
        ) {
            address token0 = IPancakePair(pancakePair).token0();
            (uint256 pnbReserve, uint256 bnbReserve) = token0 == address(this)
                ? (uint256(reserve0), uint256(reserve1))
                : (uint256(reserve1), uint256(reserve0));

            if (pnbReserve == 0 || bnbReserve == 0) {
                return 0;
            }

            // Calculate expected output using constant product formula
            // amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
            uint256 amountInWithFee = tokenAmount * 9975; // 0.25% PancakeSwap fee
            uint256 numerator = amountInWithFee * bnbReserve;
            uint256 denominator = (pnbReserve * 10000) + amountInWithFee;
            uint256 expectedOutput = numerator / denominator;

            // Apply slippage tolerance
            uint256 minOutput = (expectedOutput * (10000 - slippageToleranceBps)) / 10000;

            return minOutput;
        } catch {
            // If reserves can't be read, accept any amount (fallback behavior)
            return 0;
        }
    }

    /**
     * @dev Calculate max swap amount (0.3% of LP reserves by default)
     */
    function calculateMaxSwapAmount() public view returns (uint256) {
        try IPancakePair(pancakePair).getReserves() returns (
            uint112 reserve0,
            uint112 reserve1,
            uint32
        ) {
            address token0 = IPancakePair(pancakePair).token0();
            uint256 pnbReserve = (token0 == address(this)) ? uint256(reserve0) : uint256(reserve1);

            // Return maxSwapBps of PNB reserves (default 0.3%)
            return (pnbReserve * maxSwapBps) / 10000;
        } catch {
            // If reserves can't be read, return swapThreshold
            return swapThreshold;
        }
    }

    /**
     * @dev Set AMM pair status (owner only)
     */
    function setAMMPair(address pair, bool value) external onlyOwner {
        require(pair != address(0), "Pair cannot be zero address");
        isAMMPair[pair] = value;
        emit AMMPairUpdated(pair, value);
    }

    /**
     * @notice Schedules a tax rate change with 24-hour timelock
     * @dev Enforces minimum 1% and maximum 10% tax rates for security
     * @param newBuyTax New buy tax in basis points (100-1000, representing 1%-10%)
     * @param newSellTax New sell tax in basis points (100-1000, representing 1%-10%)
     *
     * Requirements:
     * - Only callable by owner
     * - newBuyTax must be >= 100 (1%) and <= 1000 (10%)
     * - newSellTax must be >= 100 (1%) and <= 1000 (10%)
     * - Must call executeTaxRateChange() after 24 hours to apply changes
     *
     * Emits: {TaxChangeScheduled} event
     */
    function scheduleTaxRateChange(uint256 newBuyTax, uint256 newSellTax) external onlyOwner {
        require(newBuyTax >= MIN_TAX_BPS, "Buy tax too low"); // Min 1%
        require(newSellTax >= MIN_TAX_BPS, "Sell tax too low"); // Min 1%
        require(newBuyTax <= 1000, "Buy tax too high"); // Max 10%
        require(newSellTax <= 1000, "Sell tax too high"); // Max 10%

        pendingBuyTaxBps = newBuyTax;
        pendingSellTaxBps = newSellTax;
        taxChangeTimestamp = block.timestamp + TAX_CHANGE_DELAY;
        hasPendingTaxChange = true;

        emit TaxChangeScheduled(newBuyTax, newSellTax, taxChangeTimestamp);
    }

    /**
     * @dev Execute pending tax rate change (after timelock expires)
     */
    function executeTaxRateChange() external onlyOwner {
        require(hasPendingTaxChange, "No pending tax change");
        require(block.timestamp >= taxChangeTimestamp, "Timelock not expired");

        buyTaxBps = pendingBuyTaxBps;
        sellTaxBps = pendingSellTaxBps;
        hasPendingTaxChange = false;

        emit TaxRatesUpdated(buyTaxBps, sellTaxBps);
    }

    /**
     * @dev Cancel pending tax rate change
     */
    function cancelTaxRateChange() external onlyOwner {
        require(hasPendingTaxChange, "No pending tax change");
        hasPendingTaxChange = false;
        pendingBuyTaxBps = 0;
        pendingSellTaxBps = 0;
        taxChangeTimestamp = 0;
        emit TaxChangeCancelled();
    }

    /**
     * @dev Manual trigger for swapAndDonate (owner only)
     */
    function manualSwapAndDonate() external onlyOwner {
        uint256 contractBalance = balanceOf(address(this));
        require(contractBalance > 0, "No tokens to swap");
        swapAndDonate(contractBalance);
    }

    /**
     * @dev Update swap threshold
     */
    function setSwapThreshold(uint256 newThreshold) external onlyOwner {
        swapThreshold = newThreshold;
        emit SwapThresholdUpdated(newThreshold);
    }

    /**
     * @dev Enable/disable automatic swaps
     */
    function setSwapEnabled(bool enabled) external onlyOwner {
        swapEnabled = enabled;
        emit SwapEnabledUpdated(enabled);
    }

    /**
     * @dev Update max swap percentage (MEV protection)
     */
    function setMaxSwapBps(uint256 newMaxSwapBps) external onlyOwner {
        require(newMaxSwapBps <= 100, "Max swap too high"); // Max 1%
        maxSwapBps = newMaxSwapBps;
        emit MaxSwapBpsUpdated(newMaxSwapBps);
    }

    /**
     * @notice Updates the charity wallet address
     * @dev Validates that new wallet is not a contract or zero address
     * @param newWallet New charity wallet address (must be EOA, not contract)
     *
     * Requirements:
     * - Only callable by owner
     * - newWallet cannot be zero address
     * - newWallet cannot be a contract address (must be EOA for security)
     *
     * Emits: {CharityWalletUpdated} event
     */
    function setCharityWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Cannot be zero address");
        require(_isContract(newWallet) == false, "Cannot be contract address");
        charityWallet = newWallet;
        emit CharityWalletUpdated(newWallet);
    }

    /**
     * @dev Exclude/include address from tax
     */
    function setExcludedFromTax(address account, bool excluded) external onlyOwner {
        isExcludedFromTax[account] = excluded;
    }

    /**
     * @dev Update primary pair for max swap calculation
     */
    function setPrimaryPair(address pair) external onlyOwner {
        require(pair != address(0), "Zero address");
        pancakePair = pair;
        isAMMPair[pair] = true; // Ensure primary pair is also marked as AMM
        emit PrimaryPairUpdated(pair);
        emit AMMPairUpdated(pair, true);
    }

    /**
     * @dev Update router address
     */
    function setRouter(address newRouter) external onlyOwner {
        require(newRouter != address(0), "Zero address");
        pancakeRouter = newRouter;
        emit RouterUpdated(newRouter);
    }

    /**
     * @dev Update minimum donation BNB
     */
    function setMinDonationBNB(uint256 newMin) external onlyOwner {
        minDonationBNB = newMin;
        emit MinDonationUpdated(newMin);
    }

    /**
     * @notice Updates slippage tolerance for token swaps (MEV/sandwich attack protection)
     * @dev Used in _calculateMinBNBOutput() to determine minimum acceptable swap output
     * @param newSlippageBps New slippage tolerance in basis points (0-1000, representing 0%-10%)
     *
     * Requirements:
     * - Only callable by owner
     * - newSlippageBps must be <= 1000 (10%)
     *
     * Recommended Values:
     * - 100-300 bps (1%-3%) for normal conditions
     * - 500+ bps (5%+) for high volatility periods
     *
     * Emits: {SlippageToleranceUpdated} event
     */
    function setSlippageTolerance(uint256 newSlippageBps) external onlyOwner {
        require(newSlippageBps <= 1000, "Slippage too high"); // Max 10%
        slippageToleranceBps = newSlippageBps;
        emit SlippageToleranceUpdated(newSlippageBps);
    }

    /**
     * @dev Enable/disable trading (circuit breaker)
     */
    function setTradingEnabled(bool enabled) external onlyOwner {
        tradingEnabled = enabled;
        emit TradingEnabledSet(enabled);
    }

    /**
     * @dev Receive BNB from swaps
     */
    receive() external payable {}
}
