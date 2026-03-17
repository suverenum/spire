import { describe, it, expect } from "vitest";
import { tip20Abi } from "./abi";

describe("tip20Abi", () => {
  it("contains balanceOf function", () => {
    const balanceOf = tip20Abi.find(
      (item) => item.type === "function" && item.name === "balanceOf",
    );
    expect(balanceOf).toBeDefined();
  });

  it("contains transfer function", () => {
    const transfer = tip20Abi.find(
      (item) => item.type === "function" && item.name === "transfer",
    );
    expect(transfer).toBeDefined();
  });

  it("contains Transfer event", () => {
    const event = tip20Abi.find(
      (item) => item.type === "event" && item.name === "Transfer",
    );
    expect(event).toBeDefined();
  });

  it("Transfer event has indexed from and to", () => {
    const event = tip20Abi.find(
      (item) => item.type === "event" && item.name === "Transfer",
    );
    expect(event).toBeDefined();
    if (event && "inputs" in event) {
      const fromInput = event.inputs.find((i) => i.name === "from");
      const toInput = event.inputs.find((i) => i.name === "to");
      expect(fromInput?.indexed).toBe(true);
      expect(toInput?.indexed).toBe(true);
    }
  });
});
