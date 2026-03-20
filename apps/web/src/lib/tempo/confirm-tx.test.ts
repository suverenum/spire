import type { PublicClient, TransactionReceipt } from "viem";
import { describe, expect, it, vi } from "vitest";
import { confirmTx } from "./confirm-tx";

function mockPublicClient(receipt: Partial<TransactionReceipt>) {
	return {
		waitForTransactionReceipt: vi.fn().mockResolvedValue(receipt),
	} as unknown as PublicClient;
}

const HASH = "0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1" as `0x${string}`;

describe("confirmTx", () => {
	it("returns receipt when transaction succeeds", async () => {
		const receipt = { status: "success", transactionHash: HASH } as unknown as TransactionReceipt;
		const client = mockPublicClient(receipt);

		const result = await confirmTx(client, HASH, "deploy");

		expect(result).toBe(receipt);
		expect(client.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: HASH });
	});

	it("throws with context and hash when transaction reverts", async () => {
		const client = mockPublicClient({ status: "reverted" });

		await expect(confirmTx(client, HASH, "funding")).rejects.toThrow(
			`Transaction reverted during funding (tx: ${HASH})`,
		);
	});

	it("propagates network errors from waitForTransactionReceipt", async () => {
		const client = {
			waitForTransactionReceipt: vi.fn().mockRejectedValue(new Error("RPC timeout")),
		} as unknown as PublicClient;

		await expect(confirmTx(client, HASH, "transfer")).rejects.toThrow("RPC timeout");
	});

	it("does not throw for success status", async () => {
		const client = mockPublicClient({ status: "success" });

		// Should not throw — verifies we don't have inverted logic
		const receipt = await confirmTx(client, HASH, "test");
		expect(receipt.status).toBe("success");
	});
});
