// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPancakeRouter {
    address public WETH;

    constructor(address _weth) {
        WETH = _weth;
    }

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external {}
}
