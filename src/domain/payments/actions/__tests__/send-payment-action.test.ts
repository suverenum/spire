import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendPaymentAction } from "../send-payment-action";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/tempo/fee-sponsor", () => ({
  getFeePayer: vi.fn(() => true),
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

describe("sendPaymentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await sendPaymentAction(makeFormData({}));
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
    expect(result.gasless).toBe(false);
  });

  it("returns error for invalid input", async () => {
    mockGetSession.mockResolvedValue({
      treasuryId: "1",
      tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
      treasuryName: "Test",
      authenticatedAt: Date.now(),
    });

    const result = await sendPaymentAction(
      makeFormData({
        to: "invalid-address",
        amount: "10",
        token: "AlphaUSD",
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.gasless).toBe(false);
  });

  it("returns success with gasless flag and tx hash for valid payment", async () => {
    mockGetSession.mockResolvedValue({
      treasuryId: "1",
      tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
      treasuryName: "Test",
      authenticatedAt: Date.now(),
    });

    const result = await sendPaymentAction(
      makeFormData({
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbb",
        amount: "100",
        token: "AlphaUSD",
        memo: "Test payment",
      }),
    );
    expect(result.success).toBe(true);
    expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.gasless).toBe(true);
  });

  it("returns success without memo", async () => {
    mockGetSession.mockResolvedValue({
      treasuryId: "1",
      tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
      treasuryName: "Test",
      authenticatedAt: Date.now(),
    });

    const result = await sendPaymentAction(
      makeFormData({
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbb",
        amount: "50.123456",
        token: "BetaUSD",
      }),
    );
    expect(result.success).toBe(true);
    expect(result.gasless).toBe(true);
  });
});
