import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockRevealAgentKey = vi.fn();

vi.mock("../actions/reveal-agent-key", () => ({
	revealAgentKey: (...args: unknown[]) => mockRevealAgentKey(...args),
}));

afterEach(cleanup);

describe("RevealKeyDialog", () => {
	it("shows loading state initially", async () => {
		mockRevealAgentKey.mockReturnValue(new Promise(() => {})); // never resolves
		const { RevealKeyDialog } = await import("./reveal-key-dialog");
		render(<RevealKeyDialog walletId="w-1" onClose={vi.fn()} />);
		expect(screen.getByText("Decrypting key...")).toBeInTheDocument();
	});

	it("shows decrypted key (masked) after loading", async () => {
		mockRevealAgentKey.mockResolvedValue({
			privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
		});
		const { RevealKeyDialog } = await import("./reveal-key-dialog");
		await act(async () => {
			render(<RevealKeyDialog walletId="w-1" onClose={vi.fn()} />);
		});
		await waitFor(() => {
			expect(screen.getByText(/0xac0974be/)).toBeInTheDocument();
		});
		// Should show masked version (dots)
		expect(screen.getByText(/•/)).toBeInTheDocument();
	});

	it("shows error message on failure", async () => {
		mockRevealAgentKey.mockResolvedValue({ error: "Failed to decrypt key" });
		const { RevealKeyDialog } = await import("./reveal-key-dialog");
		await act(async () => {
			render(<RevealKeyDialog walletId="w-1" onClose={vi.fn()} />);
		});
		await waitFor(() => {
			expect(screen.getByText("Failed to decrypt key")).toBeInTheDocument();
		});
	});

	it("renders dialog with title", async () => {
		mockRevealAgentKey.mockReturnValue(new Promise(() => {}));
		const { RevealKeyDialog } = await import("./reveal-key-dialog");
		render(<RevealKeyDialog walletId="w-1" onClose={vi.fn()} />);
		expect(screen.getByText("Agent Private Key")).toBeInTheDocument();
	});

	it("calls onClose when close button clicked", async () => {
		mockRevealAgentKey.mockReturnValue(new Promise(() => {}));
		const mockClose = vi.fn();
		const { RevealKeyDialog } = await import("./reveal-key-dialog");
		render(<RevealKeyDialog walletId="w-1" onClose={mockClose} />);
		const closeButton = screen.getByRole("button");
		await act(async () => {
			closeButton.click();
		});
		expect(mockClose).toHaveBeenCalled();
	});
});
