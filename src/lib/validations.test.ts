import { describe, it, expect } from "vitest";
import {
  addressSchema,
  sendPaymentSchema,
  createTreasurySchema,
} from "./validations";

describe("addressSchema", () => {
  it("accepts valid address", () => {
    const result = addressSchema.safeParse(
      "0x1234567890abcdef1234567890abcdef12345678",
    );
    expect(result.success).toBe(true);
  });

  it("accepts uppercase hex", () => {
    const result = addressSchema.safeParse(
      "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
    );
    expect(result.success).toBe(true);
  });

  it("rejects address without 0x prefix", () => {
    const result = addressSchema.safeParse(
      "1234567890abcdef1234567890abcdef12345678",
    );
    expect(result.success).toBe(false);
  });

  it("rejects address that is too short", () => {
    const result = addressSchema.safeParse("0x1234");
    expect(result.success).toBe(false);
  });

  it("rejects address with invalid characters", () => {
    const result = addressSchema.safeParse(
      "0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
    );
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = addressSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("sendPaymentSchema", () => {
  const validPayment = {
    to: "0x1234567890abcdef1234567890abcdef12345678",
    amount: "10.50",
    token: "AlphaUSD" as const,
    memo: "Test payment",
  };

  it("accepts valid payment", () => {
    const result = sendPaymentSchema.safeParse(validPayment);
    expect(result.success).toBe(true);
  });

  it("accepts payment without memo", () => {
    const result = sendPaymentSchema.safeParse({
      to: validPayment.to,
      amount: validPayment.amount,
      token: validPayment.token,
    });
    expect(result.success).toBe(true);
  });

  it("accepts integer amount", () => {
    const result = sendPaymentSchema.safeParse({
      ...validPayment,
      amount: "100",
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const result = sendPaymentSchema.safeParse({
      ...validPayment,
      amount: "0",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero decimal amount", () => {
    const result = sendPaymentSchema.safeParse({
      ...validPayment,
      amount: "0.00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount format", () => {
    const result = sendPaymentSchema.safeParse({
      ...validPayment,
      amount: "-10",
    });
    expect(result.success).toBe(false);
  });

  it("rejects amount with too many decimals", () => {
    const result = sendPaymentSchema.safeParse({
      ...validPayment,
      amount: "10.1234567",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid token", () => {
    const result = sendPaymentSchema.safeParse({
      ...validPayment,
      token: "InvalidToken",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid tokens", () => {
    for (const token of ["AlphaUSD", "BetaUSD", "pathUSD", "ThetaUSD"]) {
      const result = sendPaymentSchema.safeParse({ ...validPayment, token });
      expect(result.success).toBe(true);
    }
  });

  it("rejects memo over 256 characters", () => {
    const result = sendPaymentSchema.safeParse({
      ...validPayment,
      memo: "a".repeat(257),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid address", () => {
    const result = sendPaymentSchema.safeParse({
      ...validPayment,
      to: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("createTreasurySchema", () => {
  it("accepts valid name", () => {
    const result = createTreasurySchema.safeParse({ name: "My Treasury" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createTreasurySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    const result = createTreasurySchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });
});
