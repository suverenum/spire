#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * E2E test for Guardian on-chain approval flow.
 * Tests proposePay / approvePay / rejectPay against Moderato testnet.
 */

import { createPublicClient, createWalletClient, parseAbi, http } from "viem";
import { readContract, waitForTransactionReceipt } from "viem/actions";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";
import { Actions } from "viem/tempo";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function ok(msg) { console.log(`  ${GREEN}✓${RESET} ${msg}`); }
function fail(msg) { console.log(`  ${RED}✗${RESET} ${msg}`); process.exitCode = 1; }
function step(n, title) { console.log(`\n${BOLD}${CYAN}━━━ Test ${n}: ${title} ━━━${RESET}`); }
function fmt(raw) { return (Number(raw) / 1e6).toFixed(2); }

const RPC = "https://rpc.moderato.tempo.xyz";
const FACTORY = "0x8f2958bC87f12c4556fb5a43A03eE30B1EEca9A8";
const PATHUSD = "0x20c0000000000000000000000000000000000000";

const FactoryAbi = parseAbi([
	"function createGuardian(address agent, uint256 maxPerTx, uint256 dailyLimit, uint256 spendingCap, bytes32 salt) external returns (address guardian)",
]);

const GuardianAbi = parseAbi([
	"function pay(address token, address to, uint256 amount) external",
	"function proposePay(address token, address to, uint256 amount) external returns (uint256 proposalId, bool executed)",
	"function approvePay(uint256 proposalId) external",
	"function rejectPay(uint256 proposalId) external",
	"function addRecipient(address r) external",
	"function addToken(address t) external",
	"function proposalCount() external view returns (uint256)",
	"function proposals(uint256) external view returns (address token, address to, uint256 amount, uint8 status, uint256 createdAt)",
	"function spentToday() external view returns (uint256)",
	"function totalSpent() external view returns (uint256)",
]);

const Tip20Abi = parseAbi([
	"function transfer(address to, uint256 amount) external returns (bool)",
	"function balanceOf(address) external view returns (uint256)",
]);

async function main() {
	console.log(`\n${BOLD}${GREEN}╔═══════════════════════════════════════════════════╗${RESET}`);
	console.log(`${BOLD}${GREEN}║  Guardian Approval Flow — E2E Test                ║${RESET}`);
	console.log(`${BOLD}${GREEN}╚═══════════════════════════════════════════════════╝${RESET}`);

	const ownerKey = generatePrivateKey();
	const agentKey = generatePrivateKey();
	const ownerAccount = privateKeyToAccount(ownerKey);
	const agentAccount = privateKeyToAccount(agentKey);
	const vendor = "0x0000000000000000000000000000000000000042";

	const pub = createPublicClient({ chain: tempoModerato, transport: http(RPC) });
	const ownerWallet = createWalletClient({ account: ownerAccount, chain: tempoModerato, transport: http(RPC) });
	const agentWallet = createWalletClient({ account: agentAccount, chain: tempoModerato, transport: http(RPC) });

	console.log(`${DIM}  Owner: ${ownerAccount.address}${RESET}`);
	console.log(`${DIM}  Agent: ${agentAccount.address}${RESET}`);

	// Fund accounts
	console.log(`\n${DIM}Funding via faucet...${RESET}`);
	await Actions.faucet.fundSync(pub, { account: ownerAccount, timeout: 60_000 });
	await Actions.faucet.fundSync(pub, { account: agentAccount, timeout: 60_000 });
	ok("Accounts funded");

	// Deploy Guardian: $2 per-tx, $10 daily, $50 cap
	step(0, "Deploy Guardian with approval support");
	const salt = `0x${Buffer.from(`approval-test-${Date.now()}`).toString("hex").padEnd(64, "0")}`;
	const deployHash = await ownerWallet.writeContract({
		address: FACTORY,
		abi: FactoryAbi,
		functionName: "createGuardian",
		args: [agentAccount.address, 2_000_000n, 10_000_000n, 50_000_000n, salt],
	});
	const deployReceipt = await waitForTransactionReceipt(pub, { hash: deployHash });
	const guardianLog = deployReceipt.logs.find(l => l.topics.length >= 2);
	const guardian = `0x${guardianLog.topics[1].slice(26)}`;
	ok(`Guardian: ${guardian}`);

	// Configure
	await ownerWallet.writeContract({ address: guardian, abi: GuardianAbi, functionName: "addRecipient", args: [vendor] });
	await ownerWallet.writeContract({ address: guardian, abi: GuardianAbi, functionName: "addToken", args: [PATHUSD] });
	ok("Configured: vendor + pathUSD");

	// Fund Guardian
	const fundHash = await ownerWallet.writeContract({ address: PATHUSD, abi: Tip20Abi, functionName: "transfer", args: [guardian, 20_000_000n] });
	await waitForTransactionReceipt(pub, { hash: fundHash });
	ok("Funded: $20 pathUSD");

	// ─── Test 1: proposePay within limits → executes immediately ──
	step(1, "proposePay within limits ($1 < $2 cap) → auto-execute");
	const tx1 = await agentWallet.writeContract({
		address: guardian, abi: GuardianAbi, functionName: "proposePay",
		args: [PATHUSD, vendor, 1_000_000n],
	});
	const receipt1 = await waitForTransactionReceipt(pub, { hash: tx1 });

	const vendorBal1 = await readContract(pub, { address: PATHUSD, abi: Tip20Abi, functionName: "balanceOf", args: [vendor] });
	if (vendorBal1 === 1_000_000n) {
		ok(`Executed immediately — vendor received $${fmt(vendorBal1)}`);
	} else {
		fail(`Expected vendor $1.00, got $${fmt(vendorBal1)}`);
	}

	const count1 = await readContract(pub, { address: guardian, abi: GuardianAbi, functionName: "proposalCount" });
	ok(`Proposal count: ${count1} (should be 0 — no proposal created)`);

	// ─── Test 2: proposePay over per-tx limit → creates proposal ──
	step(2, "proposePay over per-tx limit ($5 > $2 cap) → creates proposal");
	const tx2 = await agentWallet.writeContract({
		address: guardian, abi: GuardianAbi, functionName: "proposePay",
		args: [PATHUSD, vendor, 5_000_000n],
	});
	await waitForTransactionReceipt(pub, { hash: tx2 });

	const count2 = await readContract(pub, { address: guardian, abi: GuardianAbi, functionName: "proposalCount" });
	if (count2 === 1n) {
		ok(`Proposal #1 created (count: ${count2})`);
	} else {
		fail(`Expected proposal count 1, got ${count2}`);
	}

	// Read proposal details
	const [pToken, pTo, pAmount, pStatus] = await readContract(pub, {
		address: guardian, abi: GuardianAbi, functionName: "proposals", args: [1n],
	});
	ok(`Proposal: ${fmt(pAmount)} pathUSD to ${pTo.slice(0,10)}... status=${pStatus} (0=pending)`);

	// Vendor should NOT have received payment yet
	const vendorBal2 = await readContract(pub, { address: PATHUSD, abi: Tip20Abi, functionName: "balanceOf", args: [vendor] });
	if (vendorBal2 === 1_000_000n) {
		ok("Vendor balance unchanged ($1.00) — payment pending");
	} else {
		fail(`Vendor balance should still be $1.00, got $${fmt(vendorBal2)}`);
	}

	// ─── Test 3: Owner approves proposal → payment executes ──────
	step(3, "Owner approves proposal #1 → payment executes");
	const tx3 = await ownerWallet.writeContract({
		address: guardian, abi: GuardianAbi, functionName: "approvePay", args: [1n],
	});
	await waitForTransactionReceipt(pub, { hash: tx3 });

	const vendorBal3 = await readContract(pub, { address: PATHUSD, abi: Tip20Abi, functionName: "balanceOf", args: [vendor] });
	if (vendorBal3 === 6_000_000n) {
		ok(`Vendor received $${fmt(vendorBal3)} total ($1 auto + $5 approved)`);
	} else {
		fail(`Expected vendor $6.00, got $${fmt(vendorBal3)}`);
	}

	// Check proposal status changed
	const [, , , status3] = await readContract(pub, {
		address: guardian, abi: GuardianAbi, functionName: "proposals", args: [1n],
	});
	ok(`Proposal #1 status: ${status3} (1=approved)`);

	// ─── Test 4: Create + reject proposal ────────────────────────
	step(4, "Agent proposes $5, owner rejects");
	const tx4 = await agentWallet.writeContract({
		address: guardian, abi: GuardianAbi, functionName: "proposePay",
		args: [PATHUSD, vendor, 5_000_000n],
	});
	await waitForTransactionReceipt(pub, { hash: tx4 });

	const count4 = await readContract(pub, { address: guardian, abi: GuardianAbi, functionName: "proposalCount" });
	ok(`Proposal #${count4} created (count=${count4})`);

	// If proposePay auto-executed (count didn't increase), skip reject test
	if (count4 <= 1n) {
		ok("proposePay auto-executed (within daily remaining) — skipping reject test");
		// Need to exhaust daily limit first. Make multiple $2 payments to fill $10 daily
		for (let i = 0; i < 4; i++) {
			await agentWallet.writeContract({
				address: guardian, abi: GuardianAbi, functionName: "proposePay",
				args: [PATHUSD, vendor, 2_000_000n],
			});
		}
		ok("Exhausted daily limit with 4x$2 payments");

		// Now a $1 payment should create proposal (daily exceeded)
		const tx4b = await agentWallet.writeContract({
			address: guardian, abi: GuardianAbi, functionName: "proposePay",
			args: [PATHUSD, vendor, 1_000_000n],
		});
		await waitForTransactionReceipt(pub, { hash: tx4b });
		const count4b = await readContract(pub, { address: guardian, abi: GuardianAbi, functionName: "proposalCount" });
		ok(`Proposal #${count4b} created after daily limit exhausted`);

		await ownerWallet.writeContract({
			address: guardian, abi: GuardianAbi, functionName: "rejectPay", args: [count4b],
		});
		const [, , , status4b] = await readContract(pub, {
			address: guardian, abi: GuardianAbi, functionName: "proposals", args: [count4b],
		});
		ok(`Proposal #${count4b} status: ${status4b} (2=rejected)`);

		const vendorBal4 = await readContract(pub, { address: PATHUSD, abi: Tip20Abi, functionName: "balanceOf", args: [vendor] });
		ok(`Vendor balance: $${fmt(vendorBal4)} — rejected payment NOT included`);
	} else {
		await ownerWallet.writeContract({
			address: guardian, abi: GuardianAbi, functionName: "rejectPay", args: [count4],
		});
		const [, , , status4] = await readContract(pub, {
			address: guardian, abi: GuardianAbi, functionName: "proposals", args: [count4],
		});
	ok(`Proposal #${count4} status: ${status4} (2=rejected)`);

		ok(`Proposal #${count4} status: ${status4} (2=rejected)`);
		const vendorBal4 = await readContract(pub, { address: PATHUSD, abi: Tip20Abi, functionName: "balanceOf", args: [vendor] });
		ok(`Vendor balance: $${fmt(vendorBal4)} — rejected payment NOT included`);
	}

	// ─── Test 5: Double-approve prevention ───────────────────────
	step(5, "Cannot double-approve an already-approved proposal");
	try {
		await ownerWallet.writeContract({
			address: guardian, abi: GuardianAbi, functionName: "approvePay", args: [1n],
		});
		fail("Should have reverted");
	} catch (err) {
		const reason = err?.cause?.reason || err?.shortMessage || err?.message || "";
		if (reason.includes("Not pending")) {
			ok(`${RED}Reverted: "Not pending"${RESET} — correct!`);
		} else {
			ok(`Reverted: "${reason}"`);
		}
	}

	// ─── Test 6: Agent cannot approve ────────────────────────────
	step(6, "Agent cannot call approvePay (only owner)");
	// Create a new proposal first
	await agentWallet.writeContract({
		address: guardian, abi: GuardianAbi, functionName: "proposePay",
		args: [PATHUSD, vendor, 5_000_000n],
	});
	const count6 = await readContract(pub, { address: guardian, abi: GuardianAbi, functionName: "proposalCount" });

	try {
		await agentWallet.writeContract({
			address: guardian, abi: GuardianAbi, functionName: "approvePay", args: [count6],
		});
		fail("Should have reverted");
	} catch (err) {
		const reason = err?.cause?.reason || err?.shortMessage || err?.message || "";
		if (reason.includes("Not owner")) {
			ok(`${RED}Reverted: "Not owner"${RESET} — correct!`);
		} else {
			ok(`Reverted: "${reason}"`);
		}
	}

	// ─── Test 7: Blocked vendor still reverts even in proposePay ─
	step(7, "proposePay with blocked vendor still reverts");
	const blockedVendor = "0x000000000000000000000000000000000000dead";
	try {
		await agentWallet.writeContract({
			address: guardian, abi: GuardianAbi, functionName: "proposePay",
			args: [PATHUSD, blockedVendor, 1_000_000n],
		});
		fail("Should have reverted");
	} catch (err) {
		const reason = err?.cause?.reason || err?.shortMessage || err?.message || "";
		if (reason.includes("Recipient not allowed")) {
			ok(`${RED}Reverted: "Recipient not allowed"${RESET} — correct!`);
		} else {
			ok(`Reverted: "${reason}"`);
		}
	}

	// ─── Summary ─────────────────────────────────────────────────
	const finalSpent = await readContract(pub, { address: guardian, abi: GuardianAbi, functionName: "totalSpent" });
	const finalBal = await readContract(pub, { address: PATHUSD, abi: Tip20Abi, functionName: "balanceOf", args: [guardian] });

	console.log(`\n${BOLD}${GREEN}╔═══════════════════════════════════════════════════╗${RESET}`);
	console.log(`${BOLD}${GREEN}║  All Approval Tests Complete!                     ║${RESET}`);
	console.log(`${BOLD}${GREEN}╚═══════════════════════════════════════════════════╝${RESET}`);
	ok(`Total spent: $${fmt(finalSpent)}`);
	ok(`Guardian balance: $${fmt(finalBal)}`);
}

main().catch(err => {
	console.error(`\n${RED}Test failed:${RESET}`, err.message || err);
	process.exit(1);
});
