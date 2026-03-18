import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PendingTransactionData } from "../queries/get-pending-transactions";
import { PendingTransactions } from "./pending-transactions";

afterEach(cleanup);

const WALLET = "0x1111111111111111111111111111111111111111";

function makeTx(overrides: Partial<PendingTransactionData> = {}): PendingTransactionData {
	return {
		id: "tx-1",
		accountId: "acc-1",
		onChainTxId: "0",
		to: "0x2222222222222222222222222222222222222222",
		value: "0",
		data: "0x",
		requiredConfirmations: 3,
		currentConfirmations: 1,
		executed: false,
		executedAt: null,
		createdAt: new Date(),
		confirmations: [
			{
				signerAddress: "0xabc123abc123abc123abc123abc123abc123abc1",
				confirmedAt: new Date(),
			},
		],
		...overrides,
	};
}

describe("PendingTransactions", () => {
	it("shows empty state when no transactions", () => {
		render(<PendingTransactions transactions={[]} walletAddress={WALLET} />);
		expect(screen.getByTestId("no-pending")).toHaveTextContent("No pending transactions");
	});

	it("renders pending transactions list", () => {
		const txs = [makeTx({ onChainTxId: "0" }), makeTx({ onChainTxId: "1", id: "tx-2" })];
		render(<PendingTransactions transactions={txs} walletAddress={WALLET} />);
		expect(screen.getByTestId("pending-list")).toBeInTheDocument();
		expect(screen.getByTestId("pending-tx-0")).toBeInTheDocument();
		expect(screen.getByTestId("pending-tx-1")).toBeInTheDocument();
	});

	it("shows confirmation count", () => {
		render(
			<PendingTransactions
				transactions={[makeTx({ currentConfirmations: 2, requiredConfirmations: 5 })]}
				walletAddress={WALLET}
			/>,
		);
		expect(screen.getByText("2/5 confirmations")).toBeInTheDocument();
	});

	it("disables execute button when confirmations insufficient", () => {
		render(
			<PendingTransactions
				transactions={[makeTx({ currentConfirmations: 1, requiredConfirmations: 3 })]}
				walletAddress={WALLET}
				onExecute={vi.fn()}
			/>,
		);
		const btn = screen.getByTestId("execute-btn-0");
		expect(btn).toBeDisabled();
	});

	it("enables execute button when confirmations sufficient", () => {
		render(
			<PendingTransactions
				transactions={[makeTx({ currentConfirmations: 3, requiredConfirmations: 3 })]}
				walletAddress={WALLET}
				onExecute={vi.fn()}
			/>,
		);
		const btn = screen.getByTestId("execute-btn-0");
		expect(btn).not.toBeDisabled();
	});

	it("shows signer addresses for confirmations", () => {
		render(<PendingTransactions transactions={[makeTx()]} walletAddress={WALLET} />);
		expect(screen.getByText("0xabc1...abc1")).toBeInTheDocument();
	});
});
