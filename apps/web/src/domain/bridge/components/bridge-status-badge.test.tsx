import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BridgeStatusBadge } from "./bridge-status-badge";

afterEach(cleanup);

describe("BridgeStatusBadge", () => {
	it("renders pending status", () => {
		render(<BridgeStatusBadge status="pending" />);
		expect(screen.getByText("Pending")).toBeInTheDocument();
	});

	it("renders bridging status with animated dot", () => {
		const { container } = render(<BridgeStatusBadge status="bridging" />);
		expect(screen.getByText("Bridging...")).toBeInTheDocument();
		const dot = container.querySelector(".animate-pulse");
		expect(dot).toBeTruthy();
	});

	it("renders completed status", () => {
		render(<BridgeStatusBadge status="completed" />);
		expect(screen.getByText("Arrived")).toBeInTheDocument();
	});

	it("renders failed status", () => {
		render(<BridgeStatusBadge status="failed" />);
		expect(screen.getByText("Failed")).toBeInTheDocument();
	});

	it("applies correct color classes for each status", () => {
		const { rerender, container } = render(<BridgeStatusBadge status="pending" />);
		expect(container.firstChild).toHaveClass("bg-yellow-100", "text-yellow-800");

		rerender(<BridgeStatusBadge status="bridging" />);
		expect(container.firstChild).toHaveClass("bg-blue-100", "text-blue-800");

		rerender(<BridgeStatusBadge status="completed" />);
		expect(container.firstChild).toHaveClass("bg-green-100", "text-green-800");

		rerender(<BridgeStatusBadge status="failed" />);
		expect(container.firstChild).toHaveClass("bg-red-100", "text-red-800");
	});
});
