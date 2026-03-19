import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database module
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockWhere = vi.fn();

vi.mock("@/db", () => ({
	db: {
		query: {
			bridgeDeposits: {
				findMany: (...args: unknown[]) => mockFindMany(...args),
			},
		},
		update: (...args: unknown[]) => {
			mockUpdate(...args);
			return {
				set: (...setArgs: unknown[]) => {
					mockSet(...setArgs);
					return {
						where: (...whereArgs: unknown[]) => mockWhere(...whereArgs),
					};
				},
			};
		},
	},
}));

vi.mock("@/db/schema", () => ({
	bridgeDeposits: {
		id: "id",
		status: "status",
		sourceTxHash: "source_tx_hash",
		lzMessageHash: "lz_message_hash",
	},
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
	vi.clearAllMocks();
});

describe("reconcilePendingBridgeDeposits", () => {
	it("processes pending deposits and updates status to completed", async () => {
		const { reconcilePendingBridgeDeposits } = await import("./reconcile-pending-deposits");

		const deposit = {
			id: "dep-1",
			sourceTxHash: "0xabc",
			lzMessageHash: null,
		};

		mockFindMany.mockResolvedValue([deposit]);
		mockFetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					data: [
						{
							guid: "lz-hash-1",
							status: { name: "DELIVERED" },
							destination: { tx: { txHash: "0xtempoHash" } },
						},
					],
				}),
		});
		mockWhere.mockResolvedValue(undefined);

		const result = await reconcilePendingBridgeDeposits();

		expect(result.processed).toBe(1);
		expect(result.completed).toBe(1);
		expect(result.failed).toBe(0);
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "completed",
				lzMessageHash: "lz-hash-1",
				tempoTxHash: "0xtempoHash",
			}),
		);
	});

	it("updates status to failed when LZ message status is FAILED", async () => {
		const { reconcilePendingBridgeDeposits } = await import("./reconcile-pending-deposits");

		mockFindMany.mockResolvedValue([{ id: "dep-2", sourceTxHash: "0xdef", lzMessageHash: null }]);
		mockFetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					data: [{ guid: "lz-2", status: { name: "FAILED" } }],
				}),
		});
		mockWhere.mockResolvedValue(undefined);

		const result = await reconcilePendingBridgeDeposits();

		expect(result.failed).toBe(1);
		expect(mockSet).toHaveBeenCalledWith({ status: "failed" });
	});

	it("updates status to bridging for in-flight messages", async () => {
		const { reconcilePendingBridgeDeposits } = await import("./reconcile-pending-deposits");

		mockFindMany.mockResolvedValue([{ id: "dep-3", sourceTxHash: "0xghi", lzMessageHash: null }]);
		mockFetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					data: [{ guid: "lz-3", status: { name: "INFLIGHT" } }],
				}),
		});
		mockWhere.mockResolvedValue(undefined);

		const result = await reconcilePendingBridgeDeposits();

		expect(result.completed).toBe(0);
		expect(result.failed).toBe(0);
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "bridging",
				lzMessageHash: "lz-3",
			}),
		);
	});

	it("skips deposits when fetch fails", async () => {
		const { reconcilePendingBridgeDeposits } = await import("./reconcile-pending-deposits");

		mockFindMany.mockResolvedValue([{ id: "dep-4", sourceTxHash: "0xjkl", lzMessageHash: null }]);
		mockFetch.mockResolvedValue({ ok: false });

		const result = await reconcilePendingBridgeDeposits();

		expect(result.processed).toBe(1);
		expect(result.completed).toBe(0);
		expect(result.failed).toBe(0);
	});

	it("returns zero counts when no pending deposits exist", async () => {
		const { reconcilePendingBridgeDeposits } = await import("./reconcile-pending-deposits");

		mockFindMany.mockResolvedValue([]);

		const result = await reconcilePendingBridgeDeposits();

		expect(result.processed).toBe(0);
		expect(result.completed).toBe(0);
		expect(result.failed).toBe(0);
	});
});
