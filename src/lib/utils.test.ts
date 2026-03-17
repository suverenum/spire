import { describe, it, expect } from "vitest";
import { cn, truncateAddress, formatBalance, formatDate } from "./utils";

describe("cn", () => {
	it("merges tailwind classes", () => {
		const result = cn("px-2 py-1", "px-3");
		expect(result).toContain("px-3");
		expect(result).toContain("py-1");
		expect(result).not.toContain("px-2");
	});

	it("handles conditional classes", () => {
		const result = cn("base", false && "hidden", "extra");
		expect(result).toBe("base extra");
	});

	it("handles empty inputs", () => {
		expect(cn()).toBe("");
	});
});

describe("truncateAddress", () => {
	it("truncates a 42-char address", () => {
		const addr = "0x1234567890abcdef1234567890abcdef12345678";
		expect(truncateAddress(addr)).toBe("0x1234...5678");
	});

	it("returns short addresses as-is", () => {
		expect(truncateAddress("0x123456")).toBe("0x123456");
	});

	it("handles exactly 10 chars", () => {
		expect(truncateAddress("0x12345678")).toBe("0x12345678");
	});
});

describe("formatBalance", () => {
	it("formats zero balance", () => {
		expect(formatBalance(0n, 6)).toBe("0.00");
	});

	it("formats whole number balance", () => {
		expect(formatBalance(1000000n, 6)).toBe("1.00");
	});

	it("formats fractional balance", () => {
		expect(formatBalance(1500000n, 6)).toBe("1.50");
	});

	it("formats large balance", () => {
		expect(formatBalance(123456789n, 6)).toBe("123.45");
	});

	it("formats small balance with full precision", () => {
		expect(formatBalance(1234n, 6)).toBe("0.001234");
	});

	it("formats sub-cent balance", () => {
		expect(formatBalance(5000n, 6)).toBe("0.005");
	});

	it("formats negative balance", () => {
		expect(formatBalance(-1500000n, 6)).toBe("-1.50");
	});

	it("formats negative sub-cent balance with full precision", () => {
		expect(formatBalance(-1234n, 6)).toBe("-0.001234");
	});
});

describe("formatDate", () => {
	it("formats a date", () => {
		const date = new Date("2026-01-15T14:30:00Z");
		const result = formatDate(date);
		// The exact format depends on locale, but should contain key parts
		expect(result).toContain("Jan");
		expect(result).toContain("15");
		expect(result).toContain("2026");
	});
});
