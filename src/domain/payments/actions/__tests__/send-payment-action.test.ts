import { describe, it, expect, vi, beforeEach } from "vitest";
import { validatePaymentAction } from "../send-payment-action";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(),
}));

import { getSession } from "@/lib/session";

const mockGetSession = vi.mocked(getSession);

function makeFormData(data: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(data)) {
		fd.set(k, v);
	}
	return fd;
}

describe("validatePaymentAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns error when not authenticated", async () => {
		mockGetSession.mockResolvedValue(null);
		const result = await validatePaymentAction(makeFormData({}));
		expect(result.valid).toBe(false);
		expect(result.error).toBe("Not authenticated");
	});

	it("returns error for invalid address", async () => {
		mockGetSession.mockResolvedValue({
			treasuryId: "1",
			tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
			treasuryName: "Test",
			authenticatedAt: Date.now(),
		});

		const result = await validatePaymentAction(
			makeFormData({
				to: "invalid-address",
				amount: "10",
				token: "AlphaUSD",
			}),
		);
		expect(result.valid).toBe(false);
		expect(result.error).toBeDefined();
	});

	it("returns valid for correct payment parameters", async () => {
		mockGetSession.mockResolvedValue({
			treasuryId: "1",
			tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
			treasuryName: "Test",
			authenticatedAt: Date.now(),
		});

		const result = await validatePaymentAction(
			makeFormData({
				to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbb",
				amount: "100",
				token: "AlphaUSD",
				memo: "Test payment",
			}),
		);
		expect(result.valid).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it("returns valid for payment without memo", async () => {
		mockGetSession.mockResolvedValue({
			treasuryId: "1",
			tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
			treasuryName: "Test",
			authenticatedAt: Date.now(),
		});

		const result = await validatePaymentAction(
			makeFormData({
				to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbb",
				amount: "50.123456",
				token: "BetaUSD",
			}),
		);
		expect(result.valid).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it("returns error for invalid token", async () => {
		mockGetSession.mockResolvedValue({
			treasuryId: "1",
			tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
			treasuryName: "Test",
			authenticatedAt: Date.now(),
		});

		const result = await validatePaymentAction(
			makeFormData({
				to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbb",
				amount: "10",
				token: "InvalidToken",
			}),
		);
		expect(result.valid).toBe(false);
		expect(result.error).toBeDefined();
	});
});
