import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BridgeTrackForm } from "./bridge-track-form";

vi.mock("@/components/ui/toast", () => ({
	toast: vi.fn(),
}));

const mockCreateBridgeDeposit = vi.fn();
vi.mock("../actions/track-deposit", () => ({
	createBridgeDeposit: (...args: unknown[]) => mockCreateBridgeDeposit(...args),
}));

function renderWithQuery(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	mockCreateBridgeDeposit.mockReset();
});

describe("BridgeTrackForm", () => {
	it("renders form fields for tx hash and amount", () => {
		renderWithQuery(<BridgeTrackForm accountId="acc-1" sourceChain="ethereum" />);
		expect(screen.getByLabelText("Source Transaction Hash")).toBeInTheDocument();
		expect(screen.getByLabelText("Amount (USDC)")).toBeInTheDocument();
	});

	it("shows correct chain label for Ethereum", () => {
		renderWithQuery(<BridgeTrackForm accountId="acc-1" sourceChain="ethereum" />);
		expect(screen.getByText("Track Ethereum Deposit")).toBeInTheDocument();
	});

	it("shows correct chain label for Solana", () => {
		renderWithQuery(<BridgeTrackForm accountId="acc-1" sourceChain="solana" />);
		expect(screen.getByText("Track Solana Deposit")).toBeInTheDocument();
	});

	it("disables submit button when fields are empty", () => {
		renderWithQuery(<BridgeTrackForm accountId="acc-1" sourceChain="ethereum" />);
		const button = screen.getByRole("button", { name: "Track deposit" });
		expect(button).toBeDisabled();
	});

	it("enables submit button when both fields are filled", () => {
		renderWithQuery(<BridgeTrackForm accountId="acc-1" sourceChain="ethereum" />);
		fireEvent.change(screen.getByLabelText("Source Transaction Hash"), {
			target: { value: "0xabc123" },
		});
		fireEvent.change(screen.getByLabelText("Amount (USDC)"), {
			target: { value: "100" },
		});
		const button = screen.getByRole("button", { name: "Track deposit" });
		expect(button).not.toBeDisabled();
	});

	it("calls createBridgeDeposit with correct params on submit", async () => {
		mockCreateBridgeDeposit.mockResolvedValue({ id: "dep-1" });

		renderWithQuery(<BridgeTrackForm accountId="acc-1" sourceChain="ethereum" />);
		fireEvent.change(screen.getByLabelText("Source Transaction Hash"), {
			target: { value: "0xabc123" },
		});
		fireEvent.change(screen.getByLabelText("Amount (USDC)"), {
			target: { value: "100.50" },
		});

		await act(async () => {
			fireEvent.submit(screen.getByRole("button", { name: "Track deposit" }).closest("form")!);
		});

		expect(mockCreateBridgeDeposit).toHaveBeenCalledWith({
			accountId: "acc-1",
			sourceChain: "ethereum",
			amount: "100.50",
			sourceTxHash: "0xabc123",
		});
	});

	it("shows success toast and clears form on success", async () => {
		mockCreateBridgeDeposit.mockResolvedValue({ id: "dep-1" });
		const { toast: mockToast } = await import("@/components/ui/toast");

		renderWithQuery(<BridgeTrackForm accountId="acc-1" sourceChain="ethereum" />);
		fireEvent.change(screen.getByLabelText("Source Transaction Hash"), {
			target: { value: "0xabc" },
		});
		fireEvent.change(screen.getByLabelText("Amount (USDC)"), {
			target: { value: "50" },
		});

		await act(async () => {
			fireEvent.submit(screen.getByRole("button", { name: "Track deposit" }).closest("form")!);
		});

		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith(
				"Deposit tracked! We'll monitor its progress.",
				"success",
			);
		});
	});

	it("shows error toast on failure", async () => {
		mockCreateBridgeDeposit.mockRejectedValue(new Error("Account not found"));
		const { toast: mockToast } = await import("@/components/ui/toast");

		renderWithQuery(<BridgeTrackForm accountId="acc-1" sourceChain="ethereum" />);
		fireEvent.change(screen.getByLabelText("Source Transaction Hash"), {
			target: { value: "0xabc" },
		});
		fireEvent.change(screen.getByLabelText("Amount (USDC)"), {
			target: { value: "50" },
		});

		await act(async () => {
			fireEvent.submit(screen.getByRole("button", { name: "Track deposit" }).closest("form")!);
		});

		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith("Account not found", "error");
		});
	});
});
