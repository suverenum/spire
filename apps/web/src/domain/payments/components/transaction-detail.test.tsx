import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Payment } from "@/lib/tempo/types";
import { TransactionDetail } from "./transaction-detail";

vi.mock("@/components/ui/toast", () => ({
	toast: vi.fn(),
}));

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const mockTx: Payment = {
	id: "tx-1",
	txHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
	from: "0x1234567890abcdef1234567890abcdef12345678",
	to: "0xabcdef1234567890abcdef1234567890abcdef12",
	amount: 5000000n,
	token: "AlphaUSD",
	status: "confirmed",
	timestamp: new Date("2026-01-15T14:30:00Z"),
	memo: "Invoice #42",
};

const mockTxNoMemo: Payment = {
	...mockTx,
	id: "tx-2",
	memo: undefined,
};

const senderAddress = "0x1234567890abcdef1234567890abcdef12345678";
const receiverAddress = "0xabcdef1234567890abcdef1234567890abcdef12";

describe("TransactionDetail", () => {
	it("renders sent transaction", () => {
		render(
			<TransactionDetail transaction={mockTx} userAddress={senderAddress} />,
		);
		expect(screen.getByText(/Sent AlphaUSD/)).toBeInTheDocument();
	});

	it("renders received transaction", () => {
		render(
			<TransactionDetail transaction={mockTx} userAddress={receiverAddress} />,
		);
		expect(screen.getByText(/Received/)).toBeInTheDocument();
	});

	it("shows negative amount for sent transaction", () => {
		render(
			<TransactionDetail transaction={mockTx} userAddress={senderAddress} />,
		);
		expect(screen.getByText(/-\$5\.00/)).toBeInTheDocument();
	});

	it("shows positive amount for received transaction", () => {
		render(
			<TransactionDetail transaction={mockTx} userAddress={receiverAddress} />,
		);
		expect(screen.getByText(/\+\$5\.00/)).toBeInTheDocument();
	});

	it("shows amount", () => {
		render(
			<TransactionDetail transaction={mockTx} userAddress={senderAddress} />,
		);
		expect(screen.getByText(/\$5\.00/)).toBeInTheDocument();
	});

	it("shows memo when present", () => {
		render(
			<TransactionDetail transaction={mockTx} userAddress={senderAddress} />,
		);
		expect(screen.getByText("Invoice #42")).toBeInTheDocument();
		expect(screen.getByText("Memo")).toBeInTheDocument();
	});

	it("does not show memo section when memo is absent", () => {
		render(
			<TransactionDetail
				transaction={mockTxNoMemo}
				userAddress={senderAddress}
			/>,
		);
		expect(screen.queryByText("Memo")).not.toBeInTheDocument();
	});

	it("shows status", () => {
		render(
			<TransactionDetail transaction={mockTx} userAddress={senderAddress} />,
		);
		expect(screen.getByText("confirmed")).toBeInTheDocument();
	});

	it("shows from and to addresses", () => {
		render(
			<TransactionDetail transaction={mockTx} userAddress={senderAddress} />,
		);
		expect(screen.getByText("From")).toBeInTheDocument();
		expect(screen.getByText("To")).toBeInTheDocument();
		expect(screen.getByText(mockTx.from)).toBeInTheDocument();
		expect(screen.getByText(mockTx.to)).toBeInTheDocument();
	});

	it("shows block explorer link", () => {
		render(
			<TransactionDetail transaction={mockTx} userAddress={senderAddress} />,
		);
		const link = screen.getByText("View on Explorer").closest("a");
		expect(link).toHaveAttribute(
			"href",
			`https://explore.tempo.xyz/tx/${mockTx.txHash}`,
		);
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("shows transaction hash label and value", () => {
		render(
			<TransactionDetail transaction={mockTx} userAddress={senderAddress} />,
		);
		expect(screen.getByText("Transaction Hash")).toBeInTheDocument();
		expect(screen.getByText(mockTx.txHash)).toBeInTheDocument();
	});

	describe("CopyableField", () => {
		beforeEach(() => {
			Object.assign(navigator, {
				clipboard: {
					writeText: vi.fn().mockResolvedValue(undefined),
				},
			});
		});

		it("copies From address when copy button is clicked", async () => {
			const { toast: mockToast } = await import("@/components/ui/toast");
			render(
				<TransactionDetail transaction={mockTx} userAddress={senderAddress} />,
			);

			// There are 3 CopyableFields: From, To, Transaction Hash
			// Each has a button with Copy icon
			const copyButtons = screen.getAllByRole("button");
			// The first copy button corresponds to "From"
			await act(async () => {
				fireEvent.click(copyButtons[0]);
			});

			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockTx.from);
			expect(mockToast).toHaveBeenCalledWith("Copied!", "success");
		});

		it("copies To address when copy button is clicked", async () => {
			const { toast: mockToast } = await import("@/components/ui/toast");
			render(
				<TransactionDetail transaction={mockTx} userAddress={senderAddress} />,
			);

			const copyButtons = screen.getAllByRole("button");
			// The second copy button corresponds to "To"
			await act(async () => {
				fireEvent.click(copyButtons[1]);
			});

			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockTx.to);
			expect(mockToast).toHaveBeenCalledWith("Copied!", "success");
		});

		it("copies transaction hash when copy button is clicked", async () => {
			const { toast: mockToast } = await import("@/components/ui/toast");
			render(
				<TransactionDetail transaction={mockTx} userAddress={senderAddress} />,
			);

			const copyButtons = screen.getAllByRole("button");
			// The third copy button corresponds to "Transaction Hash"
			await act(async () => {
				fireEvent.click(copyButtons[2]);
			});

			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockTx.txHash);
			expect(mockToast).toHaveBeenCalledWith("Copied!", "success");
		});

		it("shows error toast when clipboard write fails", async () => {
			const { toast: mockToast } = await import("@/components/ui/toast");
			Object.assign(navigator, {
				clipboard: {
					writeText: vi.fn().mockRejectedValue(new Error("Clipboard denied")),
				},
			});

			render(
				<TransactionDetail transaction={mockTx} userAddress={senderAddress} />,
			);

			const copyButtons = screen.getAllByRole("button");
			await act(async () => {
				fireEvent.click(copyButtons[0]);
			});

			expect(mockToast).toHaveBeenCalledWith("Failed to copy", "error");
		});
	});
});
