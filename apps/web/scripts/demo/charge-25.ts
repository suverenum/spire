import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readContract, waitForTransactionReceipt } from "viem/actions";
import { tempoModerato } from "viem/chains";

const agent = privateKeyToAccount(
	"0x2804cbba04cea055984b27972abf6eb63f95bd4d0d8f1e395a41dca8966f4907",
);
const pub = createPublicClient({
	chain: tempoModerato,
	transport: http("https://rpc.moderato.tempo.xyz"),
});
const aw = createWalletClient({
	account: agent,
	chain: tempoModerato,
	transport: http("https://rpc.moderato.tempo.xyz"),
});

const G = "0x303b28924076a9863e6717ed77bd6975ebd79558" as const;
const TOKEN = "0x20c0000000000000000000000000000000000001" as const;
const VENDOR = "0x0000000000000000000000000000000000000001" as const;
const abi = parseAbi([
	"function pay(address,address,uint256) external",
	"function proposePay(address,address,uint256) external returns (uint256,bool)",
	"function spentToday() view returns (uint256)",
	"function totalSpent() view returns (uint256)",
	"function dailyLimit() view returns (uint256)",
	"function spendingCap() view returns (uint256)",
]);
const tip20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const fmt = (n: bigint) => (Number(n) / 1e6).toFixed(2);

console.log("\n=== Charging $25 via Guardian ===\n");

const spentBefore = await readContract(pub, { address: G, abi, functionName: "spentToday" });
const totalBefore = await readContract(pub, { address: G, abi, functionName: "totalSpent" });
const daily = await readContract(pub, { address: G, abi, functionName: "dailyLimit" });
const cap = await readContract(pub, { address: G, abi, functionName: "spendingCap" });
const balBefore = await readContract(pub, {
	address: TOKEN,
	abi: tip20,
	functionName: "balanceOf",
	args: [G],
});

console.log("Before:");
console.log(`  Spent today: $${fmt(spentBefore)} / $${fmt(daily)} daily`);
console.log(`  Total spent: $${fmt(totalBefore)} / $${fmt(cap)} lifetime`);
console.log(`  Balance: $${fmt(balBefore)}`);
console.log("");

// $25 = try $2 payments, when daily limit hit switch to proposePay
const TARGET = 25_000_000n;
const PER_TX = 2_000_000n;
let totalPaid = 0n;
let proposalsCreated = 0;

console.log("Paying $2 at a time (per-tx cap = $2)...\n");

while (totalPaid < TARGET) {
	const remaining = TARGET - totalPaid;
	const amount = remaining < PER_TX ? remaining : PER_TX;

	try {
		const h = await aw.writeContract({
			address: G,
			abi,
			functionName: "pay",
			args: [TOKEN, VENDOR, amount],
		});
		await waitForTransactionReceipt(pub, { hash: h });
		totalPaid += amount;
		console.log(`  ✓ pay($${fmt(amount)}) — total: $${fmt(totalPaid)}`);
	} catch (e: any) {
		const r = e?.cause?.reason || e?.shortMessage || "";
		if (r.includes("Daily limit") || r.includes("Spending cap") || r.includes("Exceeds per-tx")) {
			// Switch to proposePay
			try {
				const h = await aw.writeContract({
					address: G,
					abi,
					functionName: "proposePay",
					args: [TOKEN, VENDOR, amount],
				});
				await waitForTransactionReceipt(pub, { hash: h });
				proposalsCreated++;
				totalPaid += amount;
				console.log(
					`  → proposePay($${fmt(amount)}) — proposal #${proposalsCreated} created (needs approval)`,
				);
			} catch (e2: any) {
				const r2 = e2?.cause?.reason || e2?.shortMessage || "";
				console.log(`  ✗ Both pay and proposePay failed: ${r2.slice(0, 80)}`);
				break;
			}
		} else {
			console.log(`  ✗ Unexpected error: ${r.slice(0, 80)}`);
			break;
		}
	}
}

const spentAfter = await readContract(pub, { address: G, abi, functionName: "spentToday" });
const totalAfter = await readContract(pub, { address: G, abi, functionName: "totalSpent" });
const balAfter = await readContract(pub, {
	address: TOKEN,
	abi: tip20,
	functionName: "balanceOf",
	args: [G],
});

console.log(`\nAfter:`);
console.log(`  Spent today: $${fmt(spentAfter)} / $${fmt(daily)} daily`);
console.log(`  Total spent: $${fmt(totalAfter)} / $${fmt(cap)} lifetime`);
console.log(`  Balance: $${fmt(balAfter)}`);
console.log(`  Direct payments: $${fmt(totalPaid - BigInt(proposalsCreated) * PER_TX)}`);
console.log(`  Proposals created: ${proposalsCreated} (need owner approval)`);
if (proposalsCreated > 0) {
	console.log(`\n  → Approve at: https://45.148.101.191.nip.io:6677/agents`);
}
