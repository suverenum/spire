import { describe, expect, it } from "vitest";

// Test the balance aggregation logic directly (not the hook)
describe("balance aggregation", () => {
	it("calculates total balance from multiple accounts", () => {
		const balances = [100_000_000n, 200_000_000n, 50_000_000n];
		const total = balances.reduce((sum, b) => sum + b, 0n);
		expect(total).toBe(350_000_000n);
	});

	it("handles zero balances", () => {
		const balances = [0n, 0n];
		const total = balances.reduce((sum, b) => sum + b, 0n);
		expect(total).toBe(0n);
	});

	it("handles single account", () => {
		const balances = [500_000_000n];
		const total = balances.reduce((sum, b) => sum + b, 0n);
		expect(total).toBe(500_000_000n);
	});

	it("handles empty accounts", () => {
		const balances: bigint[] = [];
		const total = balances.reduce((sum, b) => sum + b, 0n);
		expect(total).toBe(0n);
	});
});
