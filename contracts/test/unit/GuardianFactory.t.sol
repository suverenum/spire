// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../helpers/MockERC20.sol";
import {SimpleGuardian} from "../../src/SimpleGuardian.sol";
import {GuardianFactory} from "../../src/GuardianFactory.sol";

contract GuardianFactoryTest is Test {
    GuardianFactory factory;
    MockERC20 usdc;

    address owner;
    address agentAddr;
    address vendor;
    address stranger;

    uint256 constant MAX_PER_TX = 2_000_000; // 2 USDC
    uint256 constant DAILY_LIMIT = 10_000_000; // 10 USDC
    uint256 constant SPENDING_CAP = 50_000_000; // 50 USDC

    function setUp() public {
        owner = vm.addr(1);
        agentAddr = vm.addr(2);
        vendor = vm.addr(3);
        stranger = vm.addr(4);

        vm.label(owner, "Owner");
        vm.label(agentAddr, "Agent");
        vm.label(vendor, "Vendor");
        vm.label(stranger, "Stranger");

        factory = new GuardianFactory();
        usdc = new MockERC20("USD Coin", "USDC", 6);
        vm.label(address(usdc), "USDC");
    }

    // -----------------------------------------------------------------------
    // Factory: createGuardian
    // -----------------------------------------------------------------------

    function test_createGuardian_deploysAtPredictedAddress() public {
        bytes32 salt = bytes32(uint256(1));

        address predicted = factory.getGuardianAddress(owner, agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt);

        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt);

        assertEq(guardian, predicted, "Deployed address should match prediction");
    }

    function test_createGuardian_setsOwnerAndAgent() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0));

        assertEq(SimpleGuardian(guardian).owner(), owner);
        assertEq(SimpleGuardian(guardian).agent(), agentAddr);
    }

    function test_createGuardian_setsLimits() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0));

        assertEq(SimpleGuardian(guardian).maxPerTx(), MAX_PER_TX);
        assertEq(SimpleGuardian(guardian).dailyLimit(), DAILY_LIMIT);
    }

    function test_createGuardian_emitsEvent() public {
        bytes32 salt = bytes32(uint256(42));

        vm.prank(owner);
        vm.expectEmit(false, true, true, true);
        emit GuardianFactory.GuardianCreated(address(0), owner, agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP);
        factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt);
    }

    function test_createGuardian_duplicateSaltReverts() public {
        bytes32 salt = bytes32(uint256(99));

        vm.prank(owner);
        factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt);

        vm.prank(owner);
        vm.expectRevert();
        factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt);
    }

    function test_createGuardian_differentDeployersSameSalt() public {
        bytes32 salt = bytes32(uint256(1));

        vm.prank(owner);
        address g1 = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt);

        vm.prank(stranger);
        address g2 = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt);

        assertTrue(g1 != g2, "Different deployers should produce different addresses");
    }

    // -----------------------------------------------------------------------
    // SimpleGuardian: pay() through factory-deployed instance
    // -----------------------------------------------------------------------

    function test_factoryGuardian_payWorks() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0));

        // Owner configures Guardian
        vm.startPrank(owner);
        SimpleGuardian(guardian).addRecipient(vendor);
        SimpleGuardian(guardian).addToken(address(usdc));
        vm.stopPrank();

        // Fund Guardian with USDC
        usdc.mint(guardian, 50_000_000);

        // Agent pays vendor
        vm.prank(agentAddr);
        SimpleGuardian(guardian).pay(address(usdc), vendor, 1_000_000);

        assertEq(usdc.balanceOf(vendor), 1_000_000);
        assertEq(usdc.balanceOf(guardian), 49_000_000);
    }

    // -----------------------------------------------------------------------
    // SimpleGuardian: removeRecipient
    // -----------------------------------------------------------------------

    function test_removeRecipient() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0));

        vm.startPrank(owner);
        SimpleGuardian(guardian).addRecipient(vendor);
        assertTrue(SimpleGuardian(guardian).allowedRecipients(vendor));

        SimpleGuardian(guardian).removeRecipient(vendor);
        assertFalse(SimpleGuardian(guardian).allowedRecipients(vendor));
        SimpleGuardian(guardian).addToken(address(usdc));
        vm.stopPrank();
        usdc.mint(guardian, 10_000_000);

        vm.prank(agentAddr);
        vm.expectRevert("Recipient not allowed");
        SimpleGuardian(guardian).pay(address(usdc), vendor, 1_000_000);
    }

    // -----------------------------------------------------------------------
    // SimpleGuardian: removeToken
    // -----------------------------------------------------------------------

    function test_removeToken() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0));

        vm.startPrank(owner);
        SimpleGuardian(guardian).addRecipient(vendor);
        SimpleGuardian(guardian).addToken(address(usdc));
        SimpleGuardian(guardian).removeToken(address(usdc));
        vm.stopPrank();

        usdc.mint(guardian, 10_000_000);

        vm.prank(agentAddr);
        vm.expectRevert("Token not allowed");
        SimpleGuardian(guardian).pay(address(usdc), vendor, 1_000_000);
    }

    // -----------------------------------------------------------------------
    // SimpleGuardian: updateLimits
    // -----------------------------------------------------------------------

    function test_updateLimits() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0));

        vm.prank(owner);
        SimpleGuardian(guardian).updateLimits(5_000_000, 20_000_000);

        assertEq(SimpleGuardian(guardian).maxPerTx(), 5_000_000);
        assertEq(SimpleGuardian(guardian).dailyLimit(), 20_000_000);
    }

    function test_updateLimits_onlyOwner() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0));

        vm.prank(stranger);
        vm.expectRevert("Not owner");
        SimpleGuardian(guardian).updateLimits(5_000_000, 20_000_000);
    }

    // -----------------------------------------------------------------------
    // SimpleGuardian: withdraw
    // -----------------------------------------------------------------------

    function test_withdraw() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0));

        usdc.mint(guardian, 50_000_000);

        vm.prank(owner);
        SimpleGuardian(guardian).withdraw(address(usdc));

        assertEq(usdc.balanceOf(guardian), 0);
        assertEq(usdc.balanceOf(owner), 50_000_000);
    }

    function test_withdraw_onlyOwner() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0));

        usdc.mint(guardian, 10_000_000);

        vm.prank(agentAddr);
        vm.expectRevert("Not owner");
        SimpleGuardian(guardian).withdraw(address(usdc));
    }

    function test_withdraw_emptyBalance() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0));

        vm.prank(owner);
        vm.expectRevert("No balance");
        SimpleGuardian(guardian).withdraw(address(usdc));
    }

    // -----------------------------------------------------------------------
    // SimpleGuardian: per-tx and daily limit enforcement
    // -----------------------------------------------------------------------

    function test_perTxLimit() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0));

        vm.startPrank(owner);
        SimpleGuardian(guardian).addRecipient(vendor);
        SimpleGuardian(guardian).addToken(address(usdc));
        vm.stopPrank();

        usdc.mint(guardian, 50_000_000);

        // Try to pay more than maxPerTx
        vm.prank(agentAddr);
        vm.expectRevert("Exceeds per-tx limit");
        SimpleGuardian(guardian).pay(address(usdc), vendor, 3_000_000); // 3 > 2 USDC
    }

    function test_dailyLimit() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0));

        vm.startPrank(owner);
        SimpleGuardian(guardian).addRecipient(vendor);
        SimpleGuardian(guardian).addToken(address(usdc));
        vm.stopPrank();

        usdc.mint(guardian, 50_000_000);

        // Exhaust daily limit with 5 x 2 USDC payments
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(agentAddr);
            SimpleGuardian(guardian).pay(address(usdc), vendor, 2_000_000);
        }

        // 6th payment should fail (10 USDC spent, 0 remaining)
        vm.prank(agentAddr);
        vm.expectRevert("Daily limit exceeded");
        SimpleGuardian(guardian).pay(address(usdc), vendor, 1_000_000);
    }

    // -----------------------------------------------------------------------
    // SimpleGuardian: spending cap (lifetime total)
    // -----------------------------------------------------------------------

    function test_spendingCap() public {
        // Deploy with small spending cap: 5 USDC total lifetime
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, 5_000_000, bytes32(uint256(200)));

        vm.startPrank(owner);
        SimpleGuardian(guardian).addRecipient(vendor);
        SimpleGuardian(guardian).addToken(address(usdc));
        vm.stopPrank();

        usdc.mint(guardian, 50_000_000);

        // Pay 2 USDC twice = 4 USDC total
        vm.prank(agentAddr);
        SimpleGuardian(guardian).pay(address(usdc), vendor, 2_000_000);
        vm.prank(agentAddr);
        SimpleGuardian(guardian).pay(address(usdc), vendor, 2_000_000);

        // 3rd payment of 2 USDC would exceed 5 USDC cap
        vm.prank(agentAddr);
        vm.expectRevert("Spending cap exceeded");
        SimpleGuardian(guardian).pay(address(usdc), vendor, 2_000_000);
    }

    function test_spendingCapZeroMeansUnlimited() public {
        // Deploy with spendingCap = 0 (unlimited)
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, 0, bytes32(uint256(201)));

        vm.startPrank(owner);
        SimpleGuardian(guardian).addRecipient(vendor);
        SimpleGuardian(guardian).addToken(address(usdc));
        vm.stopPrank();

        usdc.mint(guardian, 50_000_000);

        // Can pay multiple times without hitting cap
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(agentAddr);
            SimpleGuardian(guardian).pay(address(usdc), vendor, 2_000_000);
        }
        // All succeeded, no revert
        assertEq(usdc.balanceOf(vendor), 10_000_000);
    }

    // -----------------------------------------------------------------------
    // Approval flow: proposePay / approvePay / rejectPay
    // -----------------------------------------------------------------------

    function test_proposePay_withinLimits_executesImmediately() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(uint256(300)));

        vm.startPrank(owner);
        SimpleGuardian(guardian).addRecipient(vendor);
        SimpleGuardian(guardian).addToken(address(usdc));
        vm.stopPrank();
        usdc.mint(guardian, 50_000_000);

        vm.prank(agentAddr);
        (uint256 proposalId, bool executed) = SimpleGuardian(guardian).proposePay(address(usdc), vendor, 1_000_000);

        assertTrue(executed, "Should execute immediately within limits");
        assertEq(proposalId, 0, "No proposal created");
        assertEq(usdc.balanceOf(vendor), 1_000_000);
    }

    function test_proposePay_overLimit_createsProposal() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(uint256(301)));

        vm.startPrank(owner);
        SimpleGuardian(guardian).addRecipient(vendor);
        SimpleGuardian(guardian).addToken(address(usdc));
        vm.stopPrank();
        usdc.mint(guardian, 50_000_000);

        // 5 USDC > 2 USDC per-tx cap
        vm.prank(agentAddr);
        (uint256 proposalId, bool executed) = SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);

        assertFalse(executed, "Should NOT execute over limit");
        assertEq(proposalId, 1, "First proposal is ID 1");
        assertEq(usdc.balanceOf(vendor), 0, "No payment yet");
        assertEq(SimpleGuardian(guardian).proposalCount(), 1);
    }

    function test_approvePay_executesPayment() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(uint256(302)));

        vm.startPrank(owner);
        SimpleGuardian(guardian).addRecipient(vendor);
        SimpleGuardian(guardian).addToken(address(usdc));
        vm.stopPrank();
        usdc.mint(guardian, 50_000_000);

        // Agent proposes over-limit payment
        vm.prank(agentAddr);
        (uint256 proposalId, ) = SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);
        assertEq(proposalId, 1);

        // Owner approves
        vm.prank(owner);
        SimpleGuardian(guardian).approvePay(1);

        assertEq(usdc.balanceOf(vendor), 5_000_000, "Vendor received payment after approval");
    }

    function test_rejectPay_noPayment() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(uint256(303)));

        vm.startPrank(owner);
        SimpleGuardian(guardian).addRecipient(vendor);
        SimpleGuardian(guardian).addToken(address(usdc));
        vm.stopPrank();
        usdc.mint(guardian, 50_000_000);

        vm.prank(agentAddr);
        SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);

        // Owner rejects
        vm.prank(owner);
        SimpleGuardian(guardian).rejectPay(1);

        assertEq(usdc.balanceOf(vendor), 0, "No payment after rejection");

        // Can't approve after rejection
        vm.prank(owner);
        vm.expectRevert("Not pending");
        SimpleGuardian(guardian).approvePay(1);
    }

    function test_approvePay_onlyOwner() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(uint256(304)));

        vm.startPrank(owner);
        SimpleGuardian(guardian).addRecipient(vendor);
        SimpleGuardian(guardian).addToken(address(usdc));
        vm.stopPrank();
        usdc.mint(guardian, 50_000_000);

        vm.prank(agentAddr);
        SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);

        // Agent tries to approve — should fail
        vm.prank(agentAddr);
        vm.expectRevert("Not owner");
        SimpleGuardian(guardian).approvePay(1);
    }

    function test_approvePay_cannotDoubleApprove() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(uint256(305)));

        vm.startPrank(owner);
        SimpleGuardian(guardian).addRecipient(vendor);
        SimpleGuardian(guardian).addToken(address(usdc));
        vm.stopPrank();
        usdc.mint(guardian, 50_000_000);

        vm.prank(agentAddr);
        SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);

        vm.prank(owner);
        SimpleGuardian(guardian).approvePay(1);

        // Double approve reverts
        vm.prank(owner);
        vm.expectRevert("Not pending");
        SimpleGuardian(guardian).approvePay(1);
    }

    function test_proposePay_blockedVendor_reverts() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(uint256(306)));

        vm.startPrank(owner);
        SimpleGuardian(guardian).addToken(address(usdc));
        vm.stopPrank();
        usdc.mint(guardian, 50_000_000);

        // Vendor NOT in allowlist — proposePay should revert too
        vm.prank(agentAddr);
        vm.expectRevert("Recipient not allowed");
        SimpleGuardian(guardian).proposePay(address(usdc), vendor, 1_000_000);
    }
}
