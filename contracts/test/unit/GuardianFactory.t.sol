// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../helpers/MockERC20.sol";
import {MockERC20False} from "../helpers/MockERC20False.sol";
import {MockTIP20} from "../helpers/MockTIP20.sol";
import {SimpleGuardian} from "../../src/SimpleGuardian.sol";
import {GuardianFactory} from "../../src/GuardianFactory.sol";

contract GuardianFactoryTest is Test {
    GuardianFactory factory;
    MockERC20 usdc;

    address owner;
    address agentAddr;
    address vendor;
    address stranger;

    // Empty arrays for convenience
    address[] emptyAddrs;

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

    // Helper to create single-element arrays
    function _addr(address a) internal pure returns (address[] memory arr) {
        arr = new address[](1);
        arr[0] = a;
    }

    // Helper to deploy a standard guardian with allowlists
    function _deployGuardian(bytes32 salt) internal returns (address) {
        return _deployGuardianCustom(MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt);
    }

    function _deployGuardianCustom(uint256 _maxPerTx, uint256 _daily, uint256 _cap, bytes32 salt)
        internal
        returns (address)
    {
        address[] memory recipients = _addr(vendor);
        address[] memory tokens = _addr(address(usdc));
        vm.prank(owner);
        return factory.createGuardian(agentAddr, _maxPerTx, _daily, _cap, salt, recipients, tokens);
    }

    // =======================================================================
    // Factory: createGuardian
    // =======================================================================

    function test_createGuardian_deploysAtPredictedAddress() public {
        bytes32 salt = bytes32(uint256(1));

        address predicted = factory.getGuardianAddress(
            owner, agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt, emptyAddrs, emptyAddrs
        );

        vm.prank(owner);
        address guardian =
            factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt, emptyAddrs, emptyAddrs);

        assertEq(guardian, predicted, "Deployed address should match prediction");
    }

    function test_createGuardian_setsOwnerAndAgent() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(
            agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0), emptyAddrs, emptyAddrs
        );

        assertEq(SimpleGuardian(guardian).owner(), owner);
        assertEq(SimpleGuardian(guardian).agent(), agentAddr);
    }

    function test_createGuardian_setsLimits() public {
        vm.prank(owner);
        address guardian = factory.createGuardian(
            agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0), emptyAddrs, emptyAddrs
        );

        assertEq(SimpleGuardian(guardian).maxPerTx(), MAX_PER_TX);
        assertEq(SimpleGuardian(guardian).dailyLimit(), DAILY_LIMIT);
        assertEq(SimpleGuardian(guardian).spendingCap(), SPENDING_CAP);
    }

    function test_createGuardian_setsInitialAllowlists() public {
        address guardian = _deployGuardian(bytes32(uint256(10)));

        assertTrue(SimpleGuardian(guardian).allowedRecipients(vendor), "Vendor should be allowed");
        assertTrue(SimpleGuardian(guardian).allowedTokens(address(usdc)), "Token should be allowed");
    }

    function test_createGuardian_emitsEvent() public {
        bytes32 salt = bytes32(uint256(42));

        vm.prank(owner);
        vm.expectEmit(false, true, true, true);
        emit GuardianFactory.GuardianCreated(address(0), owner, agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP);
        factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt, emptyAddrs, emptyAddrs);
    }

    function test_createGuardian_duplicateSaltReverts() public {
        bytes32 salt = bytes32(uint256(99));

        vm.prank(owner);
        factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt, emptyAddrs, emptyAddrs);

        vm.prank(owner);
        vm.expectRevert();
        factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt, emptyAddrs, emptyAddrs);
    }

    function test_createGuardian_differentDeployersSameSalt() public {
        bytes32 salt = bytes32(uint256(1));

        vm.prank(owner);
        address g1 =
            factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt, emptyAddrs, emptyAddrs);

        vm.prank(stranger);
        address g2 =
            factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, salt, emptyAddrs, emptyAddrs);

        assertTrue(g1 != g2, "Different deployers should produce different addresses");
    }

    // =======================================================================
    // Factory: Input Validation (D-GF-VALIDATE)
    // =======================================================================

    function test_createGuardian_zeroAgent_reverts() public {
        vm.prank(owner);
        vm.expectRevert(GuardianFactory.ZeroAddress.selector);
        factory.createGuardian(address(0), MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0), emptyAddrs, emptyAddrs);
    }

    function test_createGuardian_zeroRecipient_reverts() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0);

        vm.prank(owner);
        vm.expectRevert(GuardianFactory.ZeroAddress.selector);
        factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0), recipients, emptyAddrs);
    }

    function test_createGuardian_zeroToken_reverts() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(0);

        vm.prank(owner);
        vm.expectRevert(GuardianFactory.ZeroAddress.selector);
        factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0), emptyAddrs, tokens);
    }

    function test_createGuardian_tooManyRecipients_reverts() public {
        address[] memory recipients = new address[](65);
        for (uint256 i = 0; i < 65; i++) {
            recipients[i] = vm.addr(100 + i);
        }

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(GuardianFactory.AllowlistTooLarge.selector, 64));
        factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(0), recipients, emptyAddrs);
    }

    // =======================================================================
    // SimpleGuardian: pay() through factory-deployed instance
    // =======================================================================

    function test_factoryGuardian_payWorks() public {
        address guardian = _deployGuardian(bytes32(0));
        usdc.mint(guardian, 50_000_000);

        vm.prank(agentAddr);
        SimpleGuardian(guardian).pay(address(usdc), vendor, 1_000_000);

        assertEq(usdc.balanceOf(vendor), 1_000_000);
        assertEq(usdc.balanceOf(guardian), 49_000_000);
    }

    // =======================================================================
    // SimpleGuardian: removeRecipient / removeToken
    // =======================================================================

    function test_removeRecipient() public {
        address guardian = _deployGuardian(bytes32(0));
        assertTrue(SimpleGuardian(guardian).allowedRecipients(vendor));

        vm.prank(owner);
        SimpleGuardian(guardian).removeRecipient(vendor);
        assertFalse(SimpleGuardian(guardian).allowedRecipients(vendor));

        usdc.mint(guardian, 10_000_000);
        vm.prank(agentAddr);
        vm.expectRevert(abi.encodeWithSelector(SimpleGuardian.RecipientNotAllowed.selector, vendor));
        SimpleGuardian(guardian).pay(address(usdc), vendor, 1_000_000);
    }

    function test_removeToken() public {
        address guardian = _deployGuardian(bytes32(uint256(50)));
        vm.prank(owner);
        SimpleGuardian(guardian).removeToken(address(usdc));

        usdc.mint(guardian, 10_000_000);
        vm.prank(agentAddr);
        vm.expectRevert(abi.encodeWithSelector(SimpleGuardian.TokenNotAllowed.selector, address(usdc)));
        SimpleGuardian(guardian).pay(address(usdc), vendor, 1_000_000);
    }

    // =======================================================================
    // SimpleGuardian: updateLimits (now 3 params + invariant validation)
    // =======================================================================

    function test_updateLimits() public {
        address guardian = _deployGuardian(bytes32(uint256(60)));

        vm.prank(owner);
        SimpleGuardian(guardian).updateLimits(5_000_000, 20_000_000, 100_000_000);

        assertEq(SimpleGuardian(guardian).maxPerTx(), 5_000_000);
        assertEq(SimpleGuardian(guardian).dailyLimit(), 20_000_000);
        assertEq(SimpleGuardian(guardian).spendingCap(), 100_000_000);
    }

    function test_updateLimits_onlyOwner() public {
        address guardian = _deployGuardian(bytes32(uint256(61)));

        vm.prank(stranger);
        vm.expectRevert(SimpleGuardian.NotOwner.selector);
        SimpleGuardian(guardian).updateLimits(5_000_000, 20_000_000, 100_000_000);
    }

    function test_updateLimits_invariantViolation_reverts() public {
        address guardian = _deployGuardian(bytes32(uint256(62)));

        // maxPerTx > dailyLimit
        vm.prank(owner);
        vm.expectRevert(SimpleGuardian.LimitsInvariantViolation.selector);
        SimpleGuardian(guardian).updateLimits(20_000_000, 10_000_000, 50_000_000);

        // dailyLimit > spendingCap
        vm.prank(owner);
        vm.expectRevert(SimpleGuardian.LimitsInvariantViolation.selector);
        SimpleGuardian(guardian).updateLimits(2_000_000, 50_000_000, 10_000_000);

        // zero values
        vm.prank(owner);
        vm.expectRevert(SimpleGuardian.LimitsInvariantViolation.selector);
        SimpleGuardian(guardian).updateLimits(0, 10_000_000, 50_000_000);
    }

    // =======================================================================
    // SimpleGuardian: withdraw
    // =======================================================================

    function test_withdraw() public {
        address guardian = _deployGuardian(bytes32(uint256(70)));
        usdc.mint(guardian, 50_000_000);

        vm.prank(owner);
        SimpleGuardian(guardian).withdraw(address(usdc));

        assertEq(usdc.balanceOf(guardian), 0);
        assertEq(usdc.balanceOf(owner), 50_000_000);
    }

    function test_withdraw_onlyOwner() public {
        address guardian = _deployGuardian(bytes32(uint256(71)));
        usdc.mint(guardian, 10_000_000);

        vm.prank(agentAddr);
        vm.expectRevert(SimpleGuardian.NotOwner.selector);
        SimpleGuardian(guardian).withdraw(address(usdc));
    }

    function test_withdraw_emptyBalance() public {
        address guardian = _deployGuardian(bytes32(uint256(72)));

        vm.prank(owner);
        vm.expectRevert();
        SimpleGuardian(guardian).withdraw(address(usdc));
    }

    // =======================================================================
    // SimpleGuardian: per-tx and daily limit enforcement
    // =======================================================================

    function test_perTxLimit() public {
        address guardian = _deployGuardian(bytes32(uint256(80)));
        usdc.mint(guardian, 50_000_000);

        vm.prank(agentAddr);
        vm.expectRevert(abi.encodeWithSelector(SimpleGuardian.ExceedsPerTxLimit.selector, 3_000_000, MAX_PER_TX));
        SimpleGuardian(guardian).pay(address(usdc), vendor, 3_000_000);
    }

    function test_dailyLimit() public {
        address guardian = _deployGuardian(bytes32(uint256(81)));
        usdc.mint(guardian, 50_000_000);

        // Exhaust daily limit with 5 x 2 USDC payments
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(agentAddr);
            SimpleGuardian(guardian).pay(address(usdc), vendor, 2_000_000);
        }

        // 6th payment should fail
        vm.prank(agentAddr);
        vm.expectRevert(abi.encodeWithSelector(SimpleGuardian.DailyLimitExceeded.selector, 11_000_000, DAILY_LIMIT));
        SimpleGuardian(guardian).pay(address(usdc), vendor, 1_000_000);
    }

    // =======================================================================
    // SimpleGuardian: spending cap (lifetime total)
    // =======================================================================

    function test_spendingCap() public {
        // Deploy with cap=5, daily=10 so cap is hit before daily limit
        // maxPerTx=2, daily=10, cap=10 but spread across days
        // Actually: use cap < daily won't work due to invariant. Use separate days instead.
        // Deploy with maxPerTx=2, daily=10, cap=15 — after 2 days spending 8+8=16 would hit cap
        address guardian = _deployGuardianCustom(2_000_000, 10_000_000, 15_000_000, bytes32(uint256(90)));
        usdc.mint(guardian, 50_000_000);

        // Day 1: Spend 8 USDC (4 x 2)
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(agentAddr);
            SimpleGuardian(guardian).pay(address(usdc), vendor, 2_000_000);
        }
        assertEq(SimpleGuardian(guardian).totalSpent(), 8_000_000);

        // Advance to Day 2 (resets daily counter)
        vm.warp(block.timestamp + 1 days + 1);

        // Day 2: Spend 6 more USDC (3 x 2) — total=14, under cap of 15
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(agentAddr);
            SimpleGuardian(guardian).pay(address(usdc), vendor, 2_000_000);
        }
        assertEq(SimpleGuardian(guardian).totalSpent(), 14_000_000);

        // Next payment of 2 USDC would make total=16 > cap=15
        vm.prank(agentAddr);
        vm.expectRevert(abi.encodeWithSelector(SimpleGuardian.SpendingCapExceeded.selector, 16_000_000, 15_000_000));
        SimpleGuardian(guardian).pay(address(usdc), vendor, 2_000_000);
    }

    function test_spendingCapZero_reverts() public {
        // spendingCap=0 violates invariant (all limits must be > 0)
        address[] memory recipients = _addr(vendor);
        address[] memory tokens = _addr(address(usdc));

        vm.prank(owner);
        vm.expectRevert(SimpleGuardian.LimitsInvariantViolation.selector);
        factory.createGuardian(agentAddr, MAX_PER_TX, DAILY_LIMIT, 0, bytes32(uint256(91)), recipients, tokens);
    }

    // =======================================================================
    // Approval flow: proposePay / approvePay / rejectPay
    // =======================================================================

    function test_proposePay_withinLimits_executesImmediately() public {
        address guardian = _deployGuardian(bytes32(uint256(100)));
        usdc.mint(guardian, 50_000_000);

        vm.prank(agentAddr);
        (uint256 proposalId, bool executed) = SimpleGuardian(guardian).proposePay(address(usdc), vendor, 1_000_000);

        assertTrue(executed, "Should execute immediately within limits");
        assertEq(proposalId, 0, "No proposal created");
        assertEq(usdc.balanceOf(vendor), 1_000_000);
    }

    function test_proposePay_overLimit_createsProposal() public {
        address guardian = _deployGuardian(bytes32(uint256(101)));
        usdc.mint(guardian, 50_000_000);

        vm.prank(agentAddr);
        (uint256 proposalId, bool executed) = SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);

        assertFalse(executed, "Should NOT execute over limit");
        assertEq(proposalId, 1, "First proposal is ID 1");
        assertEq(usdc.balanceOf(vendor), 0, "No payment yet");
        assertEq(SimpleGuardian(guardian).proposalCount(), 1);
        assertEq(SimpleGuardian(guardian).pendingCount(), 1);
    }

    function test_approvePay_executesPayment() public {
        address guardian = _deployGuardian(bytes32(uint256(102)));
        usdc.mint(guardian, 50_000_000);

        vm.prank(agentAddr);
        (uint256 proposalId,) = SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);
        assertEq(proposalId, 1);

        vm.prank(owner);
        SimpleGuardian(guardian).approvePay(1);

        assertEq(usdc.balanceOf(vendor), 5_000_000, "Vendor received payment after approval");
        assertEq(SimpleGuardian(guardian).pendingCount(), 0, "Pending count decremented");
    }

    function test_rejectPay_noPayment() public {
        address guardian = _deployGuardian(bytes32(uint256(103)));
        usdc.mint(guardian, 50_000_000);

        vm.prank(agentAddr);
        SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);

        vm.prank(owner);
        SimpleGuardian(guardian).rejectPay(1);

        assertEq(usdc.balanceOf(vendor), 0, "No payment after rejection");
        assertEq(SimpleGuardian(guardian).pendingCount(), 0, "Pending count decremented");

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SimpleGuardian.NotPending.selector, 1));
        SimpleGuardian(guardian).approvePay(1);
    }

    function test_approvePay_onlyOwner() public {
        address guardian = _deployGuardian(bytes32(uint256(104)));
        usdc.mint(guardian, 50_000_000);

        vm.prank(agentAddr);
        SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);

        vm.prank(agentAddr);
        vm.expectRevert(SimpleGuardian.NotOwner.selector);
        SimpleGuardian(guardian).approvePay(1);
    }

    function test_approvePay_cannotDoubleApprove() public {
        address guardian = _deployGuardian(bytes32(uint256(105)));
        usdc.mint(guardian, 50_000_000);

        vm.prank(agentAddr);
        SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);

        vm.prank(owner);
        SimpleGuardian(guardian).approvePay(1);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SimpleGuardian.NotPending.selector, 1));
        SimpleGuardian(guardian).approvePay(1);
    }

    function test_proposePay_blockedVendor_reverts() public {
        address[] memory tokens = _addr(address(usdc));

        vm.prank(owner);
        address guardian = factory.createGuardian(
            agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(uint256(106)), emptyAddrs, tokens
        );
        usdc.mint(guardian, 50_000_000);

        vm.prank(agentAddr);
        vm.expectRevert(abi.encodeWithSelector(SimpleGuardian.RecipientNotAllowed.selector, vendor));
        SimpleGuardian(guardian).proposePay(address(usdc), vendor, 1_000_000);
    }

    // =======================================================================
    // NEW: approvePay enforces daily + cap limits (D-SG-HARDEN)
    // =======================================================================

    function test_approvePay_countsTowardDailyAndCap() public {
        // Use a larger daily limit so proposePay doesn't revert at proposal creation
        // maxPerTx=2, daily=20, cap=50
        address guardian = _deployGuardianCustom(2_000_000, 20_000_000, 50_000_000, bytes32(uint256(110)));
        usdc.mint(guardian, 50_000_000);

        // Spend 18 USDC today via direct payments (9 x 2)
        for (uint256 i = 0; i < 9; i++) {
            vm.prank(agentAddr);
            SimpleGuardian(guardian).pay(address(usdc), vendor, 2_000_000);
        }
        assertEq(SimpleGuardian(guardian).spentToday(), 18_000_000);

        // Propose 5 USDC (over perTx=2, but within daily=20 at proposal time: 18+5=23 > 20)
        // Actually 18+5=23 > 20, so proposePay itself will revert.
        // Let's spend only 14 so proposal creation succeeds (14+5=19 < 20)
        // Reset: deploy fresh
        address guardian2 = _deployGuardianCustom(2_000_000, 20_000_000, 50_000_000, bytes32(uint256(111)));
        usdc.mint(guardian2, 50_000_000);

        // Spend 14 USDC (7 x 2)
        for (uint256 i = 0; i < 7; i++) {
            vm.prank(agentAddr);
            SimpleGuardian(guardian2).pay(address(usdc), vendor, 2_000_000);
        }
        assertEq(SimpleGuardian(guardian2).spentToday(), 14_000_000);

        // Propose 5 USDC: 14+5=19 < 20 daily → proposal created (not auto-executed since 5 > maxPerTx=2)
        vm.prank(agentAddr);
        (uint256 proposalId, bool executed) = SimpleGuardian(guardian2).proposePay(address(usdc), vendor, 5_000_000);
        assertFalse(executed);
        assertEq(proposalId, 1);

        // Now spend 2 more USDC to bring daily to 16
        vm.prank(agentAddr);
        SimpleGuardian(guardian2).pay(address(usdc), vendor, 2_000_000);
        assertEq(SimpleGuardian(guardian2).spentToday(), 16_000_000);

        // Approve 5 USDC: 16+5=21 > 20 daily → should revert
        vm.prank(owner);
        vm.expectRevert(); // DailyLimitExceeded
        SimpleGuardian(guardian2).approvePay(1);
    }

    // =======================================================================
    // NEW: SafeERC20 catches false-returning tokens
    // =======================================================================

    function test_safeTransfer_revertsOnFalseToken() public {
        MockERC20False bad = new MockERC20False();
        address[] memory recipients = _addr(vendor);
        address[] memory tokens = _addr(address(bad));

        vm.prank(owner);
        address guardian = factory.createGuardian(
            agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(uint256(120)), recipients, tokens
        );
        bad.mint(guardian, 10_000_000);

        vm.prank(agentAddr);
        vm.expectRevert(); // SafeERC20: ERC20 operation did not succeed
        SimpleGuardian(guardian).pay(address(bad), vendor, 1_000_000);
    }

    // =======================================================================
    // NEW: Pause / Unpause
    // =======================================================================

    function test_pause_blocksPay() public {
        address guardian = _deployGuardian(bytes32(uint256(130)));
        usdc.mint(guardian, 50_000_000);

        vm.prank(owner);
        SimpleGuardian(guardian).pause();
        assertTrue(SimpleGuardian(guardian).paused());

        vm.prank(agentAddr);
        vm.expectRevert(SimpleGuardian.ContractPaused.selector);
        SimpleGuardian(guardian).pay(address(usdc), vendor, 1_000_000);

        vm.prank(owner);
        SimpleGuardian(guardian).unpause();
        assertFalse(SimpleGuardian(guardian).paused());

        // Should work again
        vm.prank(agentAddr);
        SimpleGuardian(guardian).pay(address(usdc), vendor, 1_000_000);
        assertEq(usdc.balanceOf(vendor), 1_000_000);
    }

    function test_pause_blocksProposePay() public {
        address guardian = _deployGuardian(bytes32(uint256(131)));
        usdc.mint(guardian, 50_000_000);

        vm.prank(owner);
        SimpleGuardian(guardian).pause();

        vm.prank(agentAddr);
        vm.expectRevert(SimpleGuardian.ContractPaused.selector);
        SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);
    }

    function test_pause_blocksApprovePay() public {
        address guardian = _deployGuardian(bytes32(uint256(132)));
        usdc.mint(guardian, 50_000_000);

        // Create proposal while unpaused
        vm.prank(agentAddr);
        SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);

        // Pause
        vm.prank(owner);
        SimpleGuardian(guardian).pause();

        // Try to approve while paused
        vm.prank(owner);
        vm.expectRevert(SimpleGuardian.ContractPaused.selector);
        SimpleGuardian(guardian).approvePay(1);
    }

    function test_pause_emitsEvent() public {
        address guardian = _deployGuardian(bytes32(uint256(133)));

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit SimpleGuardian.PausedStateChanged(true);
        SimpleGuardian(guardian).pause();
    }

    // =======================================================================
    // NEW: setAgent (agent key rotation)
    // =======================================================================

    function test_setAgent_rotatesKey() public {
        address guardian = _deployGuardian(bytes32(uint256(140)));
        usdc.mint(guardian, 50_000_000);

        address newAgent = vm.addr(10);

        vm.prank(owner);
        SimpleGuardian(guardian).setAgent(newAgent);
        assertEq(SimpleGuardian(guardian).agent(), newAgent);

        // New agent can pay
        vm.prank(newAgent);
        SimpleGuardian(guardian).pay(address(usdc), vendor, 1_000_000);
        assertEq(usdc.balanceOf(vendor), 1_000_000);

        // Old agent cannot
        vm.prank(agentAddr);
        vm.expectRevert(SimpleGuardian.NotAgent.selector);
        SimpleGuardian(guardian).pay(address(usdc), vendor, 1_000_000);
    }

    function test_setAgent_zeroAddress_reverts() public {
        address guardian = _deployGuardian(bytes32(uint256(141)));

        vm.prank(owner);
        vm.expectRevert(SimpleGuardian.ZeroAddress.selector);
        SimpleGuardian(guardian).setAgent(address(0));
    }

    function test_setAgent_emitsEvent() public {
        address guardian = _deployGuardian(bytes32(uint256(142)));
        address newAgent = vm.addr(10);

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit SimpleGuardian.AgentUpdated(agentAddr, newAgent);
        SimpleGuardian(guardian).setAgent(newAgent);
    }

    // =======================================================================
    // NEW: 2-step ownership transfer
    // =======================================================================

    function test_transferOwnership_twoStep() public {
        address guardian = _deployGuardian(bytes32(uint256(150)));
        address newOwner = vm.addr(20);

        // Step 1: Transfer
        vm.prank(owner);
        SimpleGuardian(guardian).transferOwnership(newOwner);
        assertEq(SimpleGuardian(guardian).owner(), owner, "Owner unchanged until accept");
        assertEq(SimpleGuardian(guardian).pendingOwner(), newOwner);

        // Step 2: Accept
        vm.prank(newOwner);
        SimpleGuardian(guardian).acceptOwnership();
        assertEq(SimpleGuardian(guardian).owner(), newOwner);
        assertEq(SimpleGuardian(guardian).pendingOwner(), address(0));
    }

    function test_transferOwnership_wrongAcceptor_reverts() public {
        address guardian = _deployGuardian(bytes32(uint256(151)));
        address newOwner = vm.addr(20);

        vm.prank(owner);
        SimpleGuardian(guardian).transferOwnership(newOwner);

        vm.prank(stranger);
        vm.expectRevert(SimpleGuardian.NotOwner.selector);
        SimpleGuardian(guardian).acceptOwnership();
    }

    function test_transferOwnership_emitsEvents() public {
        address guardian = _deployGuardian(bytes32(uint256(152)));
        address newOwner = vm.addr(20);

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit SimpleGuardian.OwnershipTransferStarted(owner, newOwner);
        SimpleGuardian(guardian).transferOwnership(newOwner);

        vm.prank(newOwner);
        vm.expectEmit(true, true, true, true);
        emit SimpleGuardian.OwnershipTransferred(owner, newOwner);
        SimpleGuardian(guardian).acceptOwnership();
    }

    // =======================================================================
    // NEW: renounceOwnership reverts
    // =======================================================================

    function test_renounceOwnership_reverts() public {
        address guardian = _deployGuardian(bytes32(uint256(160)));

        vm.expectRevert(SimpleGuardian.RenounceDisabled.selector);
        SimpleGuardian(guardian).renounceOwnership();
    }

    // =======================================================================
    // NEW: Pending queue cap (MAX_PENDING = 32)
    // =======================================================================

    function test_pendingQueueFull() public {
        address guardian = _deployGuardian(bytes32(uint256(170)));
        usdc.mint(guardian, 500_000_000);

        // Fill 32 proposals
        for (uint256 i = 0; i < 32; i++) {
            vm.prank(agentAddr);
            SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);
        }
        assertEq(SimpleGuardian(guardian).pendingCount(), 32);

        // 33rd should revert
        vm.prank(agentAddr);
        vm.expectRevert(abi.encodeWithSelector(SimpleGuardian.PendingQueueFull.selector, 32));
        SimpleGuardian(guardian).proposePay(address(usdc), vendor, 5_000_000);
    }

    // =======================================================================
    // NEW: Zero-address checks in constructor
    // =======================================================================

    function test_constructor_zeroOwner_reverts() public {
        vm.expectRevert(SimpleGuardian.ZeroAddress.selector);
        new SimpleGuardian(address(0), agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, emptyAddrs, emptyAddrs);
    }

    function test_constructor_zeroAgent_reverts() public {
        vm.expectRevert(SimpleGuardian.ZeroAddress.selector);
        new SimpleGuardian(owner, address(0), MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, emptyAddrs, emptyAddrs);
    }

    function test_constructor_zeroRecipient_reverts() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0);

        vm.expectRevert(SimpleGuardian.ZeroAddress.selector);
        new SimpleGuardian(owner, agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, recipients, emptyAddrs);
    }

    // =======================================================================
    // NEW: payWithMemo — TIP-20 transferWithMemo support
    // =======================================================================

    function test_payWithMemo_callsTransferWithMemo() public {
        MockTIP20 tip20 = new MockTIP20();
        address[] memory recipients = _addr(vendor);
        address[] memory tokens = _addr(address(tip20));

        vm.prank(owner);
        address guardian = factory.createGuardian(
            agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(uint256(200)), recipients, tokens
        );
        tip20.mint(guardian, 50_000_000);

        bytes32 memo = keccak256(abi.encodePacked("invoice-123", uint256(42)));

        vm.prank(agentAddr);
        SimpleGuardian(guardian).payWithMemo(address(tip20), vendor, 1_000_000, memo);

        assertEq(tip20.balanceOf(vendor), 1_000_000);
        assertEq(tip20.lastMemo(), memo, "Memo should be passed through to TIP-20");
    }

    function test_pay_withoutMemo_usesStandardTransfer() public {
        address guardian = _deployGuardian(bytes32(uint256(201)));
        usdc.mint(guardian, 50_000_000);

        // Standard pay (no memo) — should work with regular ERC-20
        vm.prank(agentAddr);
        SimpleGuardian(guardian).pay(address(usdc), vendor, 1_000_000);

        assertEq(usdc.balanceOf(vendor), 1_000_000, "Standard pay still works");
    }

    function test_proposePayWithMemo_storesMemo() public {
        MockTIP20 tip20 = new MockTIP20();
        address[] memory recipients = _addr(vendor);
        address[] memory tokens = _addr(address(tip20));

        vm.prank(owner);
        address guardian = factory.createGuardian(
            agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(uint256(202)), recipients, tokens
        );
        tip20.mint(guardian, 50_000_000);

        bytes32 memo = keccak256(abi.encodePacked("invoice-456"));

        // 5 USDC > 2 USDC per-tx cap → creates proposal
        vm.prank(agentAddr);
        (uint256 proposalId, bool executed) =
            SimpleGuardian(guardian).proposePayWithMemo(address(tip20), vendor, 5_000_000, memo);

        assertFalse(executed);
        assertEq(proposalId, 1);

        // Approve — should pass memo through to transferWithMemo
        vm.prank(owner);
        SimpleGuardian(guardian).approvePay(1);

        assertEq(tip20.balanceOf(vendor), 5_000_000);
        assertEq(tip20.lastMemo(), memo, "Memo should be passed through on approval");
    }

    function test_proposePayWithMemo_autoExecuteWithMemo() public {
        MockTIP20 tip20 = new MockTIP20();
        address[] memory recipients = _addr(vendor);
        address[] memory tokens = _addr(address(tip20));

        vm.prank(owner);
        address guardian = factory.createGuardian(
            agentAddr, MAX_PER_TX, DAILY_LIMIT, SPENDING_CAP, bytes32(uint256(203)), recipients, tokens
        );
        tip20.mint(guardian, 50_000_000);

        bytes32 memo = keccak256(abi.encodePacked("small-payment"));

        // 1 USDC <= 2 USDC per-tx cap → auto-executes
        vm.prank(agentAddr);
        (uint256 proposalId, bool executed) =
            SimpleGuardian(guardian).proposePayWithMemo(address(tip20), vendor, 1_000_000, memo);

        assertTrue(executed, "Should auto-execute within limit");
        assertEq(proposalId, 0);
        assertEq(tip20.balanceOf(vendor), 1_000_000);
        assertEq(tip20.lastMemo(), memo, "Memo should be used even on auto-execute");
    }
}
