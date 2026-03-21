// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SimpleGuardian} from "./SimpleGuardian.sol";

/// @title GuardianFactory
/// @notice Deploys SimpleGuardian instances via CREATE2 for deterministic addresses.
///         Salt is combined with msg.sender to prevent front-running (EIP-1014).
contract GuardianFactory {
    error ZeroAddress();
    error AllowlistTooLarge(uint256 max);

    uint256 public constant MAX_ALLOWLIST = 64;

    event GuardianCreated(
        address indexed guardian,
        address indexed owner,
        address indexed agent,
        uint256 maxPerTx,
        uint256 dailyLimit,
        uint256 spendingCap
    );

    function createGuardian(
        address agent,
        uint256 maxPerTx,
        uint256 dailyLimit,
        uint256 spendingCap,
        bytes32 salt,
        address[] calldata recipients,
        address[] calldata tokens
    ) external returns (address guardian) {
        if (agent == address(0)) revert ZeroAddress();
        if (recipients.length > MAX_ALLOWLIST || tokens.length > MAX_ALLOWLIST) {
            revert AllowlistTooLarge(MAX_ALLOWLIST);
        }
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
        }
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(0)) revert ZeroAddress();
        }
        bytes32 effectiveSalt = _effectiveSalt(msg.sender, salt);
        guardian = address(
            new SimpleGuardian{salt: effectiveSalt}(
                msg.sender, agent, maxPerTx, dailyLimit, spendingCap, recipients, tokens
            )
        );
        emit GuardianCreated(guardian, msg.sender, agent, maxPerTx, dailyLimit, spendingCap);
    }

    function getGuardianAddress(
        address deployer,
        address agent,
        uint256 maxPerTx,
        uint256 dailyLimit,
        uint256 spendingCap,
        bytes32 salt,
        address[] calldata recipients,
        address[] calldata tokens
    ) external view returns (address) {
        bytes32 effectiveSalt = _effectiveSalt(deployer, salt);
        bytes32 initCodeHash = keccak256(
            abi.encodePacked(
                type(SimpleGuardian).creationCode,
                abi.encode(deployer, agent, maxPerTx, dailyLimit, spendingCap, recipients, tokens)
            )
        );
        return address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), effectiveSalt, initCodeHash))))
        );
    }

    function _effectiveSalt(address deployer, bytes32 salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(deployer, salt));
    }
}
