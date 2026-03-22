import { describe, expect, test, vi } from "vitest";

const mockFindFirst = vi.fn();
const mockInsertReturning = vi.fn().mockResolvedValue([{ id: "tx-1" }]);
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockSet = vi.fn().mockReturnValue({ where: vi.fn() });
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

vi.mock("@/db", () => ({
	db: {
		query: {
			multisigTransactions: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
		},
		insert: (...args: unknown[]) => mockInsert(...args),
		update: (...args: unknown[]) => mockUpdate(...args),
	},
}));

describe("upsertMultisigTransaction", () => {
	const validTx = {
		accountId: "acc-1",
		onChainTxId: 42n,
		to: "0x2222222222222222222222222222222222222222",
		value: "1000000",
		data: "0x",
		requiredConfirmations: 3,
		currentConfirmations: 1,
		executed: false,
	};

	test("inserts new transaction when none exists", async () => {
		mockFindFirst.mockResolvedValue(null);
		const { upsertMultisigTransaction } = await import("./sync-multisig-state");
		const result = await upsertMultisigTransaction(validTx);
		expect(result.id).toBe("tx-1");
	});

	test("updates existing transaction", async () => {
		mockFindFirst.mockResolvedValue({ id: "existing-tx-1" });
		const { upsertMultisigTransaction } = await import("./sync-multisig-state");
		const result = await upsertMultisigTransaction({
			...validTx,
			currentConfirmations: 2,
			executed: true,
		});
		expect(result.id).toBe("existing-tx-1");
	});
});

describe("addMultisigConfirmation", () => {
	test("adds confirmation successfully", async () => {
		mockInsertValues.mockReturnValueOnce({ returning: vi.fn().mockResolvedValue([{ id: "c-1" }]) });
		const { addMultisigConfirmation } = await import("./sync-multisig-state");
		await expect(
			addMultisigConfirmation({
				multisigTransactionId: "tx-1",
				signerAddress: "0xABCD000000000000000000000000000000000001",
			}),
		).resolves.not.toThrow();
	});

	test("silently ignores duplicate confirmation (idempotent)", async () => {
		mockInsertValues.mockReturnValueOnce({
			returning: vi.fn().mockRejectedValue({ code: "23505" }),
		});
		const { addMultisigConfirmation } = await import("./sync-multisig-state");
		await expect(
			addMultisigConfirmation({
				multisigTransactionId: "tx-1",
				signerAddress: "0xABCD000000000000000000000000000000000001",
			}),
		).resolves.not.toThrow();
	});
});
