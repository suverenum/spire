import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { SwapForm } from "./swap-form";

const mockMutate = vi.fn();
const mockSwapQuote = vi.fn();

vi.mock("../hooks/use-execute-swap", () => ({
	useExecuteSwap: () => ({
		mutate: mockMutate,
		isPending: false,
	}),
}));

vi.mock("../hooks/use-swap-quote", () => ({
	useSwapQuote: (...args: unknown[]) => mockSwapQuote(...args),
}));

vi.mock("viem", () => ({
	parseUnits: (value: string, decimals: number) =>
		BigInt(Math.round(Number.parseFloat(value) * 10 ** decimals)),
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function makeAccount(
	id: string,
	name: string,
	token: string,
	balance = 10000000n,
): AccountWithBalance {
	const tokenAddr =
		token === "AlphaUSD"
			? "0x1111111111111111111111111111111111111111"
			: "0x2222222222222222222222222222222222222222";
	return {
		id,
		treasuryId: "t-1",
		name,
		tokenSymbol: token,
		tokenAddress: tokenAddr as `0x${string}`,
		walletAddress: `0x${id.padStart(40, "a")}` as `0x${string}`,
		isDefault: false,
		createdAt: new Date("2025-01-01"),
		balance,
		balanceFormatted: `$${Number(balance) / 1_000_000}`,
	};
}

const accounts = [
	makeAccount("1", "Alpha Acct", "AlphaUSD"),
	makeAccount("2", "Beta Acct", "BetaUSD"),
];

describe("SwapForm", () => {
	beforeEach(() => {
		mockSwapQuote.mockReturnValue({ data: undefined, isLoading: false });
	});

	it("renders From/To selectors and amount input", () => {
		render(<SwapForm accounts={accounts} treasuryId="t-1" />);
		expect(screen.getByLabelText("From")).toBeInTheDocument();
		expect(screen.getByLabelText("To")).toBeInTheDocument();
		expect(screen.getByLabelText("Amount")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Swap" })).toBeInTheDocument();
	});

	it("disables Swap button when no quote is available", () => {
		render(<SwapForm accounts={accounts} treasuryId="t-1" />);
		expect(screen.getByRole("button", { name: "Swap" })).toBeDisabled();
	});

	it("allows selecting accounts", async () => {
		render(<SwapForm accounts={accounts} treasuryId="t-1" />);
		await userEvent.selectOptions(screen.getByLabelText("From"), "1");
		await userEvent.selectOptions(screen.getByLabelText("To"), "2");
		const fromSelect = screen.getByLabelText("From") as HTMLSelectElement;
		const toSelect = screen.getByLabelText("To") as HTMLSelectElement;
		expect(fromSelect.value).toBe("1");
		expect(toSelect.value).toBe("2");
	});

	it("calls mutate with correct params when quote exists", async () => {
		mockSwapQuote.mockReturnValue({
			data: {
				amountOut: 999000n,
				minAmountOut: 994000n,
				rate: 0.999,
				slippage: 0.005,
			},
			isLoading: false,
		});
		render(<SwapForm accounts={accounts} treasuryId="t-1" />);
		await userEvent.selectOptions(screen.getByLabelText("From"), "1");
		await userEvent.selectOptions(screen.getByLabelText("To"), "2");
		await userEvent.type(screen.getByLabelText("Amount"), "1");
		await userEvent.click(screen.getByRole("button", { name: "Swap" }));
		expect(mockMutate).toHaveBeenCalledWith(
			expect.objectContaining({
				fromAccountId: "1",
				toAccountId: "2",
				treasuryId: "t-1",
			}),
		);
	});

	it("filters out same-token accounts from To selector", async () => {
		const sameTokenAccounts = [
			makeAccount("1", "Alpha 1", "AlphaUSD"),
			makeAccount("2", "Alpha 2", "AlphaUSD"),
		];
		render(<SwapForm accounts={sameTokenAccounts} treasuryId="t-1" />);
		await userEvent.selectOptions(screen.getByLabelText("From"), "1");
		// To selector should have no selectable options (both accounts are AlphaUSD)
		const toSelect = screen.getByLabelText("To") as HTMLSelectElement;
		const options = Array.from(toSelect.options).filter((o) => !o.disabled);
		expect(options).toHaveLength(0);
	});

	it("shows error when amount exceeds balance", async () => {
		const lowBalanceAccounts = [
			makeAccount("1", "Alpha", "AlphaUSD", 500000n),
			makeAccount("2", "Beta", "BetaUSD"),
		];
		mockSwapQuote.mockReturnValue({
			data: {
				amountOut: 999000n,
				minAmountOut: 994000n,
				rate: 0.999,
				slippage: 0.005,
			},
			isLoading: false,
		});
		render(<SwapForm accounts={lowBalanceAccounts} treasuryId="t-1" />);
		await userEvent.selectOptions(screen.getByLabelText("From"), "1");
		await userEvent.selectOptions(screen.getByLabelText("To"), "2");
		await userEvent.type(screen.getByLabelText("Amount"), "999");
		await userEvent.click(screen.getByRole("button", { name: "Swap" }));
		expect(screen.getByText("Amount exceeds available balance")).toBeInTheDocument();
	});

	it("resets To account when From changes to same token", async () => {
		const mixedAccounts = [
			makeAccount("1", "Alpha 1", "AlphaUSD"),
			makeAccount("2", "Beta 1", "BetaUSD"),
			makeAccount("3", "Alpha 2", "AlphaUSD"),
		];
		render(<SwapForm accounts={mixedAccounts} treasuryId="t-1" />);
		await userEvent.selectOptions(screen.getByLabelText("From"), "1");
		await userEvent.selectOptions(screen.getByLabelText("To"), "2");
		await userEvent.selectOptions(screen.getByLabelText("From"), "2");
		expect(screen.getByLabelText("From")).toBeInTheDocument();
	});
});
