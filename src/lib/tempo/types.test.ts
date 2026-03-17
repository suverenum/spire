import { describe, it, expect } from "vitest";
import type { AccountBalance, Payment, Treasury } from "./types";

describe("tempo types", () => {
  it("AccountBalance type is structurally correct", () => {
    const balance: AccountBalance = {
      token: "AlphaUSD",
      tokenAddress: "0x1111111111111111111111111111111111111111",
      balance: 1000000n,
      decimals: 6,
    };
    expect(balance.token).toBe("AlphaUSD");
    expect(balance.decimals).toBe(6);
  });

  it("Payment type is structurally correct", () => {
    const payment: Payment = {
      id: "test-id",
      txHash:
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      from: "0x1234567890abcdef1234567890abcdef12345678",
      to: "0xabcdef1234567890abcdef1234567890abcdef12",
      amount: 5000000n,
      token: "AlphaUSD",
      status: "confirmed",
      timestamp: new Date(),
    };
    expect(payment.status).toBe("confirmed");
    expect(payment.amount).toBe(5000000n);
  });

  it("Treasury type is structurally correct", () => {
    const treasury: Treasury = {
      id: "uuid",
      name: "My Treasury",
      tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
      createdAt: new Date(),
    };
    expect(treasury.name).toBe("My Treasury");
  });

  it("Payment supports all statuses", () => {
    const statuses: Payment["status"][] = ["pending", "confirmed", "failed"];
    expect(statuses).toHaveLength(3);
  });
});
