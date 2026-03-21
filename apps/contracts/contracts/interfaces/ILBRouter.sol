// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title ILBRouter - Trader Joe Liquidity Book Router interface
/// @notice Minimal interface for swap operations on Trader Joe V2
interface ILBRouter {
    /// @notice Version of the Liquidity Book pair
    enum Version {
        V1,
        V2,
        V2_1,
        V2_2
    }

    /// @notice Path for multi-hop swaps
    struct Path {
        uint256[] pairBinSteps;
        Version[] versions;
        IERC20[] tokenPath;
    }

    /// @notice Swap exact tokens for tokens through Liquidity Book
    /// @param amountIn Amount of tokens to swap
    /// @param amountOutMin Minimum amount of output tokens
    /// @param path The path of the swap (bin steps, versions, tokens)
    /// @param to Recipient address
    /// @param deadline Unix timestamp deadline
    /// @return amountOut The amount of output tokens received
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Path memory path,
        address to,
        uint256 deadline
    ) external returns (uint256 amountOut);

    /// @notice Swap exact AVAX for tokens
    function swapExactNATIVEForTokens(
        uint256 amountOutMin,
        Path memory path,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountOut);

    /// @notice Swap exact tokens for AVAX
    function swapExactTokensForNATIVE(
        uint256 amountIn,
        uint256 amountOutMin,
        Path memory path,
        address payable to,
        uint256 deadline
    ) external returns (uint256 amountOut);

    /// @notice Get swap output amount for given input
    function getSwapOut(
        address pair,
        uint128 amountIn,
        bool swapForY
    ) external view returns (uint128 amountInLeft, uint128 amountOut, uint128 fee);
}
