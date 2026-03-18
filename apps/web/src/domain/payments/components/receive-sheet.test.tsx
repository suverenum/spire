import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReceiveSheet } from "./receive-sheet";

vi.mock("@/components/ui/toast", () => ({
	toast: vi.fn(),
}));

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("ReceiveSheet", () => {
	const addr = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;

	beforeEach(() => {
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn().mockResolvedValue(undefined),
			},
		});
	});

	it("renders nothing when closed", () => {
		const { container } = render(<ReceiveSheet open={false} onClose={() => {}} address={addr} />);
		expect(container.querySelector("svg")).toBeNull();
	});

	it("renders QR code and title when open", () => {
		render(<ReceiveSheet open={true} onClose={() => {}} address={addr} />);
		expect(screen.getByText("Receive Payment")).toBeInTheDocument();
	});

	it("shows wallet address", () => {
		render(<ReceiveSheet open={true} onClose={() => {}} address={addr} />);
		expect(screen.getByText(addr)).toBeInTheDocument();
	});

	it("shows wallet address label", () => {
		render(<ReceiveSheet open={true} onClose={() => {}} address={addr} />);
		expect(screen.getByText("Your wallet address")).toBeInTheDocument();
	});

	it("shows sharing instructions", () => {
		render(<ReceiveSheet open={true} onClose={() => {}} address={addr} />);
		expect(screen.getByText(/Share this address or QR code/)).toBeInTheDocument();
	});

	it("copies address to clipboard on copy button click", async () => {
		const { toast: mockToast } = await import("@/components/ui/toast");
		render(<ReceiveSheet open={true} onClose={() => {}} address={addr} />);

		const copyButton = screen
			.getAllByRole("button")
			.find((btn) => !btn.getAttribute("aria-label")?.includes("Close"));
		expect(copyButton).toBeDefined();

		await act(async () => {
			fireEvent.click(copyButton!);
		});

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(addr);
		expect(mockToast).toHaveBeenCalledWith("Address copied!", "success");
	});

	it("shows error toast when clipboard write fails", async () => {
		const { toast: mockToast } = await import("@/components/ui/toast");
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn().mockRejectedValue(new Error("Not allowed")),
			},
		});

		render(<ReceiveSheet open={true} onClose={() => {}} address={addr} />);

		const copyButton = screen
			.getAllByRole("button")
			.find((btn) => !btn.getAttribute("aria-label")?.includes("Close"));

		await act(async () => {
			fireEvent.click(copyButton!);
		});

		expect(mockToast).toHaveBeenCalledWith("Failed to copy", "error");
	});

	it("renders a dialog when open", () => {
		render(<ReceiveSheet open={true} onClose={() => {}} address={addr} />);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("calls onClose when close button is clicked", () => {
		const onClose = vi.fn();
		render(<ReceiveSheet open={true} onClose={onClose} address={addr} />);
		const closeButton = screen.getByLabelText("Close");
		fireEvent.click(closeButton);
		expect(onClose).toHaveBeenCalled();
	});
});
