// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Mock TIP-20 token with transferWithMemo support for testing.
contract MockTIP20 {
    string public name = "TIP20 Token";
    string public symbol = "TIP20";
    uint8 public decimals = 6;

    mapping(address => uint256) public balanceOf;

    event TransferWithMemo(address indexed from, address indexed to, uint256 amount, bytes32 indexed memo);

    bytes32 public lastMemo;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferWithMemo(address to, uint256 amount, bytes32 memo) external {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        lastMemo = memo;
        emit TransferWithMemo(msg.sender, to, amount, memo);
    }
}
