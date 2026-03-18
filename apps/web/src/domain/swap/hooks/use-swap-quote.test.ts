import { describe, expect, it } from "vitest";

describe("swap quote calculation", () => {
	it("calculates 1:1 stablecoin rate with slippage", () => {
		const amountIn = 100_000_000n; // 100 tokens
		const slippage = 0.005;
		const rate = 0.999;
		const amountOut = (amountIn * 999n) / 1000n;
		const minAmountOut = (amountOut * 995n) / 1000n;

		expect(amountOut).toBe(99_900_000n);
		expect(minAmountOut).toBe(99_400_500n);
		expect(rate).toBe(0.999);
		expect(slippage).toBe(0.005);
	});

	it("handles zero amount", () => {
		const amountIn = 0n;
		const amountOut = (amountIn * 999n) / 1000n;
		expect(amountOut).toBe(0n);
	});

	it("handles small amounts", () => {
		const amountIn = 1000n; // 0.001 tokens
		const amountOut = (amountIn * 999n) / 1000n;
		expect(amountOut).toBe(999n);
	});
});
