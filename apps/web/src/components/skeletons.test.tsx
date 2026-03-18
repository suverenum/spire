import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
	BalanceSkeleton,
	DashboardSkeleton,
	TransactionSkeleton,
} from "./skeletons";

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

describe("DashboardSkeleton", () => {
	it("renders header and content skeletons", () => {
		const { container } = render(<DashboardSkeleton />);
		const skeletons = container.querySelectorAll(".animate-pulse");
		// Header (2) + BalanceSkeleton (8) + action buttons (2) + TransactionSkeleton (15)
		expect(skeletons.length).toBeGreaterThanOrEqual(10);
	});
});
