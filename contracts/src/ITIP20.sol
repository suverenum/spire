// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title ITIP20
/// @notice Minimal TIP-20 interface extending ERC-20 with memo-bearing transfers.
///         TIP-20 is the native token standard on Tempo blockchain.
interface ITIP20 is IERC20 {
    /// @notice Transfer tokens with an attached memo for reconciliation.
    /// @param to Recipient address
    /// @param amount Transfer amount
    /// @param memo 32-byte memo (e.g. keccak256(invoiceId, nonce) for payment binding)
    function transferWithMemo(address to, uint256 amount, bytes32 memo) external;

    /// @dev Emitted when a transfer with memo occurs.
    event TransferWithMemo(address indexed from, address indexed to, uint256 amount, bytes32 indexed memo);
}
