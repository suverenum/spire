// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Mock token that always returns false on transfer — used to test SafeERC20 catches this.
contract MockERC20False {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount) return false;
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return false; // always false to test SafeERC20
    }
}
