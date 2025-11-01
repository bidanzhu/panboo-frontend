// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

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

/**
 * @title PanbooToken
 * @dev BEP-20 token with automatic charity donations on every trade
 *
 * Features:
 * - 3% buy tax, 5% sell tax
 * - Tax accumulates in contract buffer
 * - Automatic swap & donate when threshold reached
 * - Reentrancy protected
 * - Owner can trigger manual donations
 */
contract PanbooToken is ERC20, Ownable, ReentrancyGuard {
    // Tax rates (in basis points: 100 = 1%)
    uint256 public buyTaxBps = 300;  // 3%
    uint256 public sellTaxBps = 500; // 5%

    // Swap settings
    uint256 public swapThreshold = 100_000 * 10**18; // 100k tokens
    bool public swapEnabled = true;
    bool private inSwap;

    // Addresses
    address public charityWallet;
    address public pancakeRouter;
    address public pancakePair;

    // Tax exclusions
    mapping(address => bool) public isExcludedFromTax;

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
        address _pancakeRouter
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(_charityWallet != address(0), "Charity wallet cannot be zero address");
        require(_pancakeRouter != address(0), "Router cannot be zero address");

        charityWallet = _charityWallet;
        pancakeRouter = _pancakeRouter;

        // Create PancakeSwap pair
        address wbnb = IPancakeRouter02(_pancakeRouter).WETH();
        pancakePair = IPancakeFactory(
            // PancakeSwap Factory address on BSC
            0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73
        ).createPair(address(this), wbnb);

        // Exclude from tax
        isExcludedFromTax[msg.sender] = true;
        isExcludedFromTax[address(this)] = true;
        isExcludedFromTax[_charityWallet] = true;

        // Mint initial supply to deployer
        _mint(msg.sender, totalSupply);
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

        // Check if we should swap accumulated taxes
        uint256 contractBalance = balanceOf(address(this));
        bool canSwap = contractBalance >= swapThreshold;

        if (
            canSwap &&
            swapEnabled &&
            from != pancakePair && // Don't swap during buys
            !isExcludedFromTax[from] &&
            !isExcludedFromTax[to]
        ) {
            swapAndDonate(contractBalance);
        }

        // Calculate tax
        uint256 taxAmount = 0;
        bool isBuy = from == pancakePair;
        bool isSell = to == pancakePair;

        if (!isExcludedFromTax[from] && !isExcludedFromTax[to]) {
            if (isBuy) {
                taxAmount = (amount * buyTaxBps) / 10000;
                emit TaxCollected(from, pancakePair, taxAmount, false);
            } else if (isSell) {
                taxAmount = (amount * sellTaxBps) / 10000;
                emit TaxCollected(from, pancakePair, taxAmount, true);
            }
        }

        if (taxAmount > 0) {
            super._update(from, address(this), taxAmount);
            amount -= taxAmount;
        }

        super._update(from, to, amount);
    }

    /**
     * @dev Swap accumulated tokens for BNB and send to charity
     */
    function swapAndDonate(uint256 tokenAmount) public nonReentrant lockTheSwap {
        require(tokenAmount > 0, "No tokens to swap");
        require(tokenAmount <= balanceOf(address(this)), "Insufficient balance");

        // Prepare swap path
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = IPancakeRouter02(pancakeRouter).WETH();

        // Approve router
        _approve(address(this), pancakeRouter, tokenAmount);

        // Record BNB before swap
        uint256 initialBalance = address(this).balance;

        // Swap tokens for BNB
        IPancakeRouter02(pancakeRouter).swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // Accept any amount of BNB
            path,
            address(this),
            block.timestamp + 300
        );

        // Calculate BNB received
        uint256 bnbReceived = address(this).balance - initialBalance;

        // Send BNB to charity
        if (bnbReceived > 0) {
            (bool success, ) = charityWallet.call{value: bnbReceived}("");
            require(success, "BNB transfer failed");

            emit Donated(tokenAmount, bnbReceived, charityWallet, block.timestamp);
        }
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
     * @dev Update charity wallet
     */
    function setCharityWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Cannot be zero address");
        charityWallet = newWallet;
        emit CharityWalletUpdated(newWallet);
    }

    /**
     * @dev Update tax rates
     */
    function setTaxRates(uint256 newBuyTax, uint256 newSellTax) external onlyOwner {
        require(newBuyTax <= 1000, "Buy tax too high"); // Max 10%
        require(newSellTax <= 1000, "Sell tax too high"); // Max 10%
        buyTaxBps = newBuyTax;
        sellTaxBps = newSellTax;
        emit TaxRatesUpdated(newBuyTax, newSellTax);
    }

    /**
     * @dev Exclude/include address from tax
     */
    function setExcludedFromTax(address account, bool excluded) external onlyOwner {
        isExcludedFromTax[account] = excluded;
    }

    /**
     * @dev Receive BNB from swaps
     */
    receive() external payable {}
}
