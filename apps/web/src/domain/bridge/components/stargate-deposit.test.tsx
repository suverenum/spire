import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StargateDeposit } from "./stargate-deposit";

vi.mock("@/components/ui/toast", () => ({
	toast: vi.fn(),
}));

vi.mock("@layerzerolabs/stargate-ui", () => ({}));

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("StargateDeposit", () => {
	const addr = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;

	beforeEach(() => {
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText: vi.fn().mockResolvedValue(undefined) },
			writable: true,
			configurable: true,
		});
	});

	it("shows the destination address prominently", () => {
		render(<StargateDeposit chain="ethereum" destAddress={addr} />);
		expect(screen.getByText(addr)).toBeInTheDocument();
		expect(screen.getByText(/Destination/)).toBeInTheDocument();
	});

	it("shows instructions for the user", () => {
		render(<StargateDeposit chain="ethereum" destAddress={addr} />);
		expect(screen.getByText(/Set destination chain/)).toBeInTheDocument();
		expect(screen.getByText(/Paste the address above/)).toBeInTheDocument();
	});

	it("shows Ethereum chain label", () => {
		render(<StargateDeposit chain="ethereum" destAddress={addr} />);
		expect(screen.getByText(/from Ethereum/)).toBeInTheDocument();
	});

	it("shows Solana chain label", () => {
		render(<StargateDeposit chain="solana" destAddress={addr} />);
		expect(screen.getByText(/from Solana/)).toBeInTheDocument();
	});

	it("shows Stargate attribution", () => {
		render(<StargateDeposit chain="ethereum" destAddress={addr} />);
		expect(screen.getByText(/Stargate/)).toBeInTheDocument();
		expect(screen.getByText(/LayerZero/)).toBeInTheDocument();
	});

	it("copies destination address on copy button click", async () => {
		const { toast: mockToast } = await import("@/components/ui/toast");
		render(<StargateDeposit chain="ethereum" destAddress={addr} />);

		const copyButtons = screen.getAllByRole("button");
		const copyButton = copyButtons.find(
			(btn) => !btn.getAttribute("aria-label")?.includes("Close"),
		);

		await act(async () => {
			fireEvent.click(copyButton!);
		});

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(addr);
		expect(mockToast).toHaveBeenCalledWith("Address copied!", "success");
	});
});
