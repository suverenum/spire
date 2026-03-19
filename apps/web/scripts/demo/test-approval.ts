#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * E2E test for Guardian on-chain approval flow.
 * Uses relative balance assertions + receipt waiting for reliable results.
 */

import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { readContract, waitForTransactionReceipt } from "viem/actions";
import { tempoModerato } from "viem/chains";
import { Actions } from "viem/tempo";

const GREEN = "\x1b[32m",
	RED = "\x1b[31m",
	CYAN = "\x1b[36m";
const BOLD = "\x1b[1m",
	DIM = "\x1b[2m",
	RESET = "\x1b[0m";
let passed = 0,
	failed = 0;
function ok(msg) {
	passed++;
	console.log(`  ${GREEN}✓${RESET} ${msg}`);
}
function fail(msg) {
	failed++;
	console.log(`  ${RED}✗${RESET} ${msg}`);
}
function step(n, title) {
	console.log(`\n${BOLD}${CYAN}━━━ Test ${n}: ${title} ━━━${RESET}`);
}
function fmt(raw) {
	return (Number(raw) / 1e6).toFixed(2);
}

const RPC = "https://rpc.moderato.tempo.xyz";
const FACTORY = "0x8f2958bC87f12c4556fb5a43A03eE30B1EEca9A8";
const PATHUSD = "0x20c0000000000000000000000000000000000000";
const VENDOR = "0x0000000000000000000000000000000000000042";

const FactoryAbi = parseAbi([
	"function createGuardian(address,uint256,uint256,uint256,bytes32) external returns (address)",
]);
const GuardianAbi = parseAbi([
	"function proposePay(address,address,uint256) external returns (uint256,bool)",
	"function approvePay(uint256) external",
	"function rejectPay(uint256) external",
	"function addRecipient(address) external",
	"function addToken(address) external",
	"function proposalCount() view returns (uint256)",
	"function proposals(uint256) view returns (address,address,uint256,uint8,uint256)",
	"function totalSpent() view returns (uint256)",
]);
const Tip20 = parseAbi([
	"function transfer(address,uint256) external returns (bool)",
	"function balanceOf(address) view returns (uint256)",
]);

async function main() {
	console.log(`\n${BOLD}${GREEN}╔═══════════════════════════════════════════════════╗${RESET}`);
	console.log(`${BOLD}${GREEN}║  Guardian Approval Flow — E2E Test                ║${RESET}`);
	console.log(`${BOLD}${GREEN}╚═══════════════════════════════════════════════════╝${RESET}`);

	const ownerAcc = privateKeyToAccount(generatePrivateKey());
	const agentAcc = privateKeyToAccount(generatePrivateKey());
	const pub = createPublicClient({ chain: tempoModerato, transport: http(RPC) });
	const ow = createWalletClient({ account: ownerAcc, chain: tempoModerato, transport: http(RPC) });
	const aw = createWalletClient({ account: agentAcc, chain: tempoModerato, transport: http(RPC) });

	// Helper: write + wait for receipt
	async function send(client, args) {
		const hash = await client.writeContract(args);
		await waitForTransactionReceipt(pub, { hash });
		return hash;
	}
	async function bal(addr) {
		return readContract(pub, {
			address: PATHUSD,
			abi: Tip20,
			functionName: "balanceOf",
			args: [addr],
		});
	}
	async function pcount() {
		return readContract(pub, {
			address: guardian,
			abi: GuardianAbi,
			functionName: "proposalCount",
		});
	}
	async function proposal(id) {
		return readContract(pub, {
			address: guardian,
			abi: GuardianAbi,
			functionName: "proposals",
			args: [id],
		});
	}

	console.log(
		`${DIM}  Owner: ${ownerAcc.address}\n  Agent: ${agentAcc.address}${RESET}\n${DIM}Funding...${RESET}`,
	);
	await Actions.faucet.fundSync(pub, { account: ownerAcc, timeout: 60_000 });
	await Actions.faucet.fundSync(pub, { account: agentAcc, timeout: 60_000 });
	ok("Funded");

	// Deploy
	step(0, "Deploy Guardian ($2/tx, $10/day, $50 cap)");
	const salt = `0x${Buffer.from(`t${Date.now()}`).toString("hex").padEnd(64, "0")}`;
	const dh = await send(ow, {
		address: FACTORY,
		abi: FactoryAbi,
		functionName: "createGuardian",
		args: [agentAcc.address, 2_000_000n, 10_000_000n, 50_000_000n, salt],
	});
	const dr = await waitForTransactionReceipt(pub, { hash: dh });
	var guardian = `0x${dr.logs[0].topics[1].slice(26)}`;
	ok(`Guardian: ${guardian}`);
	await send(ow, {
		address: guardian,
		abi: GuardianAbi,
		functionName: "addRecipient",
		args: [VENDOR],
	});
	await send(ow, {
		address: guardian,
		abi: GuardianAbi,
		functionName: "addToken",
		args: [PATHUSD],
	});
	await send(ow, {
		address: PATHUSD,
		abi: Tip20,
		functionName: "transfer",
		args: [guardian, 20_000_000n],
	});
	ok("Configured + funded $20");

	const vendorBefore = await bal(VENDOR);

	// Test 1: proposePay within limits → auto-execute
	step(1, "proposePay $1 (within $2 cap) → auto-execute");
	await send(aw, {
		address: guardian,
		abi: GuardianAbi,
		functionName: "proposePay",
		args: [PATHUSD, VENDOR, 1_000_000n],
	});
	const d1 = (await bal(VENDOR)) - vendorBefore;
	d1 === 1_000_000n
		? ok(`Vendor +$${fmt(d1)} (auto-executed)`)
		: fail(`Expected +$1.00, got +$${fmt(d1)}`);
	(await pcount()) === 0n ? ok("No proposal (count=0)") : fail("Unexpected proposal");

	// Test 2: proposePay over limit → creates proposal
	step(2, "proposePay $5 (exceeds $2 cap) → proposal");
	await send(aw, {
		address: guardian,
		abi: GuardianAbi,
		functionName: "proposePay",
		args: [PATHUSD, VENDOR, 5_000_000n],
	});
	const c2 = await pcount();
	c2 === 1n ? ok("Proposal #1 created") : fail(`Expected count=1, got ${c2}`);
	const [, , amt2, s2] = await proposal(1n);
	ok(`Proposal: $${fmt(amt2)}, status=${s2} (pending)`);
	const d2 = (await bal(VENDOR)) - vendorBefore;
	d2 === 1_000_000n ? ok("Vendor still +$1 (pending)") : fail(`Unexpected: +$${fmt(d2)}`);

	// Test 3: Owner approves
	step(3, "Owner approves proposal #1");
	await send(ow, { address: guardian, abi: GuardianAbi, functionName: "approvePay", args: [1n] });
	const d3 = (await bal(VENDOR)) - vendorBefore;
	d3 === 6_000_000n ? ok(`Vendor +$${fmt(d3)} ($1+$5)`) : fail(`Expected +$6, got +$${fmt(d3)}`);
	const [, , , s3] = await proposal(1n);
	s3 === 1 ? ok("Status=1 (approved)") : fail(`Status ${s3}`);

	// Test 4: Propose + reject
	step(4, "Propose $5 → owner rejects");
	await send(aw, {
		address: guardian,
		abi: GuardianAbi,
		functionName: "proposePay",
		args: [PATHUSD, VENDOR, 5_000_000n],
	});
	const c4 = await pcount();
	ok(`Proposal #${c4}`);
	await send(ow, { address: guardian, abi: GuardianAbi, functionName: "rejectPay", args: [c4] });
	const [, , , s4] = await proposal(c4);
	s4 === 2 ? ok("Status=2 (rejected)") : fail(`Status ${s4}`);
	const d4 = (await bal(VENDOR)) - vendorBefore;
	d4 === 6_000_000n ? ok("Vendor unchanged") : fail(`Changed: +$${fmt(d4)}`);

	// Test 5: Double-approve
	step(5, "Cannot double-approve");
	try {
		await send(ow, { address: guardian, abi: GuardianAbi, functionName: "approvePay", args: [1n] });
		fail("No revert");
	} catch (_e) {
		ok(`Reverted: "Not pending"`);
	}

	// Test 6: Agent cannot approve
	step(6, "Agent cannot approve");
	await send(aw, {
		address: guardian,
		abi: GuardianAbi,
		functionName: "proposePay",
		args: [PATHUSD, VENDOR, 5_000_000n],
	});
	const c6 = await pcount();
	try {
		await send(aw, { address: guardian, abi: GuardianAbi, functionName: "approvePay", args: [c6] });
		fail("No revert");
	} catch (_e) {
		ok(`Reverted: "Not owner"`);
	}

	// Test 7: Blocked vendor
	step(7, "Blocked vendor in proposePay");
	try {
		await send(aw, {
			address: guardian,
			abi: GuardianAbi,
			functionName: "proposePay",
			args: [PATHUSD, "0x000000000000000000000000000000000000dead", 1_000_000n],
		});
		fail("No revert");
	} catch (_e) {
		ok(`Reverted: "Recipient not allowed"`);
	}

	// Summary
	const ts = await readContract(pub, {
		address: guardian,
		abi: GuardianAbi,
		functionName: "totalSpent",
	});
	console.log(`\n${BOLD}${GREEN}╔═══════════════════════════════════════════════════╗${RESET}`);
	console.log(
		`${BOLD}${GREEN}║  Results: ${passed} passed, ${failed} failed                      ║${RESET}`,
	);
	console.log(`${BOLD}${GREEN}╚═══════════════════════════════════════════════════╝${RESET}`);
	ok(`Total spent: $${fmt(ts)}`);
	if (failed > 0) process.exit(1);
}

main().catch((e) => {
	console.error(`${RED}FATAL:${RESET}`, e.message);
	process.exit(1);
});
