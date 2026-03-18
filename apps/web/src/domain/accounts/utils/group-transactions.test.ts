import { describe, expect, it } from "vitest";
import type { AccountRecord, Payment } from "@/lib/tempo/types";
import { groupTransactions } from "./group-transactions";

const ACCOUNT_A: AccountRecord = {
	id: "acc-a",
	treasuryId: "t-1",
	name: "Main AlphaUSD",
	tokenSymbol: "AlphaUSD",
	tokenAddress: "0x20c0000000000000000000000000000000000001",
	walletAddress: "0xaaa0000000000000000000000000000000000001",
	isDefault: true,
	createdAt: new Date("2024-01-01"),
};

const ACCOUNT_B: AccountRecord = {
	id: "acc-b",
	treasuryId: "t-1",
	name: "Main BetaUSD",
	tokenSymbol: "BetaUSD",
	tokenAddress: "0x20c0000000000000000000000000000000000002",
	walletAddress: "0xbbb0000000000000000000000000000000000002",
	isDefault: true,
	createdAt: new Date("2024-01-01"),
};

type TaggedPayment = Payment & { accountName: string; accountId: string };

function makeTx(overrides: Partial<TaggedPayment>): TaggedPayment {
	return {
		id: "tx-1",
		txHash:
			"0x1111111111111111111111111111111111111111111111111111111111111111" as `0x${string}`,
		from: "0x0000000000000000000000000000000000000099" as `0x${string}`,
		to: ACCOUNT_A.walletAddress as `0x${string}`,
		amount: 1000000n,
		token: "AlphaUSD",
		status: "confirmed",
		timestamp: new Date("2024-06-15T10:00:00Z"),
		accountName: ACCOUNT_A.name,
		accountId: ACCOUNT_A.id,
		...overrides,
	};
}

describe("groupTransactions", () => {
	it("groups regular payments by tx hash", () => {
		const txs = [makeTx({ id: "tx-1", accountId: ACCOUNT_A.id })];

		const result = groupTransactions(txs, [ACCOUNT_A, ACCOUNT_B]);
		expect(result).toHaveLength(1);
		expect(result[0].kind).toBe("payment");
		if (result[0].kind === "payment") {
			expect(result[0].direction).toBe("received");
			expect(result[0].accountId).toBe(ACCOUNT_A.id);
		}
	});

	it("identifies sent payments", () => {
		const txs = [
			makeTx({
				from: ACCOUNT_A.walletAddress as `0x${string}`,
				to: "0x0000000000000000000000000000000000000099" as `0x${string}`,
			}),
		];

		const result = groupTransactions(txs, [ACCOUNT_A, ACCOUNT_B]);
		expect(result).toHaveLength(1);
		if (result[0].kind === "payment") {
			expect(result[0].direction).toBe("sent");
		}
	});

	it("collapses internal transfers into one grouped row", () => {
		const hash =
			"0x2222222222222222222222222222222222222222222222222222222222222222" as `0x${string}`;
		const txs: TaggedPayment[] = [
			makeTx({
				id: "tx-from-a",
				txHash: hash,
				from: ACCOUNT_A.walletAddress as `0x${string}`,
				to: ACCOUNT_B.walletAddress as `0x${string}`,
				accountId: ACCOUNT_A.id,
				accountName: ACCOUNT_A.name,
			}),
			makeTx({
				id: "tx-from-b",
				txHash: hash,
				from: ACCOUNT_A.walletAddress as `0x${string}`,
				to: ACCOUNT_B.walletAddress as `0x${string}`,
				accountId: ACCOUNT_B.id,
				accountName: ACCOUNT_B.name,
			}),
		];

		const result = groupTransactions(txs, [ACCOUNT_A, ACCOUNT_B]);
		expect(result).toHaveLength(1);
		expect(result[0].kind).toBe("internalTransfer");
		if (result[0].kind === "internalTransfer") {
			expect(result[0].fromAccountId).toBe(ACCOUNT_A.id);
			expect(result[0].toAccountId).toBe(ACCOUNT_B.id);
			expect(result[0].visibleAccountIds).toContain(ACCOUNT_A.id);
			expect(result[0].visibleAccountIds).toContain(ACCOUNT_B.id);
		}
	});

	it("sorts transactions by timestamp descending", () => {
		const txs: TaggedPayment[] = [
			makeTx({
				id: "tx-old",
				txHash:
					"0x1111111111111111111111111111111111111111111111111111111111111111" as `0x${string}`,
				timestamp: new Date("2024-01-01"),
			}),
			makeTx({
				id: "tx-new",
				txHash:
					"0x3333333333333333333333333333333333333333333333333333333333333333" as `0x${string}`,
				timestamp: new Date("2024-06-01"),
			}),
		];

		const result = groupTransactions(txs, [ACCOUNT_A]);
		expect(result).toHaveLength(2);
		expect(result[0].timestamp.getTime()).toBeGreaterThan(
			result[1].timestamp.getTime(),
		);
	});

	it("returns empty array for empty input", () => {
		const result = groupTransactions([], [ACCOUNT_A]);
		expect(result).toEqual([]);
	});

	it("includes visibleAccountIds for both accounts in internal transfers", () => {
		const hash =
			"0x4444444444444444444444444444444444444444444444444444444444444444" as `0x${string}`;
		const txs: TaggedPayment[] = [
			makeTx({
				txHash: hash,
				from: ACCOUNT_A.walletAddress as `0x${string}`,
				to: ACCOUNT_B.walletAddress as `0x${string}`,
				accountId: ACCOUNT_A.id,
			}),
		];

		const result = groupTransactions(txs, [ACCOUNT_A, ACCOUNT_B]);
		expect(result[0].visibleAccountIds).toEqual([ACCOUNT_A.id, ACCOUNT_B.id]);
	});

	it("skips transactions where neither from nor to match treasury wallets", () => {
		const txs = [
			makeTx({
				from: "0x0000000000000000000000000000000000000099" as `0x${string}`,
				to: "0x0000000000000000000000000000000000000088" as `0x${string}`,
			}),
		];

		const result = groupTransactions(txs, [ACCOUNT_A, ACCOUNT_B]);
		expect(result).toHaveLength(0);
	});

	it("deduplicates payment entries with same tx hash and account", () => {
		const hash =
			"0x5555555555555555555555555555555555555555555555555555555555555555" as `0x${string}`;
		const txs: TaggedPayment[] = [
			makeTx({ id: "tx-1", txHash: hash, accountId: ACCOUNT_A.id }),
			makeTx({ id: "tx-1-dup", txHash: hash, accountId: ACCOUNT_A.id }),
		];

		const result = groupTransactions(txs, [ACCOUNT_A]);
		expect(result).toHaveLength(1);
	});

	it("deduplicates internal transfer entries with same tx hash", () => {
		const hash =
			"0x6666666666666666666666666666666666666666666666666666666666666666" as `0x${string}`;
		const txs: TaggedPayment[] = [
			makeTx({
				id: "tx-a-view",
				txHash: hash,
				from: ACCOUNT_A.walletAddress as `0x${string}`,
				to: ACCOUNT_B.walletAddress as `0x${string}`,
				accountId: ACCOUNT_A.id,
			}),
			makeTx({
				id: "tx-b-view",
				txHash: hash,
				from: ACCOUNT_A.walletAddress as `0x${string}`,
				to: ACCOUNT_B.walletAddress as `0x${string}`,
				accountId: ACCOUNT_B.id,
			}),
		];

		const result = groupTransactions(txs, [ACCOUNT_A, ACCOUNT_B]);
		// Should produce only one internal transfer entry, not two
		expect(result).toHaveLength(1);
		expect(result[0].kind).toBe("internalTransfer");
	});
});
