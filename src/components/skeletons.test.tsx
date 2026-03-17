import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { BalanceSkeleton, TransactionSkeleton } from "./skeletons";

afterEach(cleanup);

describe("BalanceSkeleton", () => {
  it("renders 4 skeleton cards", () => {
    const { container } = render(<BalanceSkeleton />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});

describe("TransactionSkeleton", () => {
  it("renders 5 skeleton rows", () => {
    const { container } = render(<TransactionSkeleton />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });
});
