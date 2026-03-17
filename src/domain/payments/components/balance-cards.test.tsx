import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BalanceCards } from "./balance-cards";

const mockUseBalances = vi.fn();

vi.mock("../hooks/use-balances", () => ({
	useBalances: (...args: unknown[]) => mockUseBalances(...args),
}));

afterEach(cleanup);

function renderWithQuery(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
	);
}

const addr = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;

describe("BalanceCards", () => {
	beforeEach(() => {
		mockUseBalances.mockReturnValue({
			data: {
				balances: [
					{
						token: "AlphaUSD",
						tokenAddress: "0x1111111111111111111111111111111111111111",
						balance: 10000000n,
						decimals: 6,
					},
					{
						token: "BetaUSD",
						tokenAddress: "0x2222222222222222222222222222222222222222",
						balance: 5000000n,
						decimals: 6,
					},
				],
				partial: false,
			},
			isLoading: false,
		});
	});

	it("renders total balance", () => {
		renderWithQuery(<BalanceCards address={addr} />);
		expect(screen.getByText("Total Balance")).toBeInTheDocument();
		expect(screen.getByText("$15.00")).toBeInTheDocument();
	});

	it("renders individual token balances", () => {
		renderWithQuery(<BalanceCards address={addr} />);
		expect(screen.getByText("AlphaUSD")).toBeInTheDocument();
		expect(screen.getByText("BetaUSD")).toBeInTheDocument();
	});

	it("shows skeleton when loading and no data", () => {
		mockUseBalances.mockReturnValue({
			data: undefined,
			isLoading: true,
		});
		renderWithQuery(<BalanceCards address={addr} />);
		// BalanceSkeleton renders animated divs, not the main content
		expect(screen.queryByText("Total Balance")).not.toBeInTheDocument();
	});

	it("shows data when loading but data exists (background refresh)", () => {
		mockUseBalances.mockReturnValue({
			data: {
				balances: [
					{
						token: "AlphaUSD",
						tokenAddress: "0x1111111111111111111111111111111111111111",
						balance: 10000000n,
						decimals: 6,
					},
				],
				partial: false,
			},
			isLoading: true,
		});
		renderWithQuery(<BalanceCards address={addr} />);
		expect(screen.getByText("Total Balance")).toBeInTheDocument();
	});

	it("shows zero total when no balances", () => {
		mockUseBalances.mockReturnValue({
			data: { balances: [], partial: false },
			isLoading: false,
		});
		renderWithQuery(<BalanceCards address={addr} />);
		expect(screen.getByText("$0.00")).toBeInTheDocument();
	});

	it("shows data when not loading and data is null (fallback to empty)", () => {
		mockUseBalances.mockReturnValue({
			data: null,
			isLoading: false,
		});
		renderWithQuery(<BalanceCards address={addr} />);
		expect(screen.getByText("$0.00")).toBeInTheDocument();
	});

	it("shows partial warning when some tokens failed to load", () => {
		mockUseBalances.mockReturnValue({
			data: {
				balances: [
					{
						token: "AlphaUSD",
						tokenAddress: "0x1111111111111111111111111111111111111111",
						balance: 10000000n,
						decimals: 6,
					},
				],
				partial: true,
			},
			isLoading: false,
		});
		renderWithQuery(<BalanceCards address={addr} />);
		expect(
			screen.getByText(
				"Some token balances could not be loaded. Totals may be incomplete.",
			),
		).toBeInTheDocument();
	});

	it("does not show partial warning when all tokens loaded", () => {
		renderWithQuery(<BalanceCards address={addr} />);
		expect(
			screen.queryByText(
				"Some token balances could not be loaded. Totals may be incomplete.",
			),
		).not.toBeInTheDocument();
	});

	it("shows error message when fetch fails and no cached data", () => {
		mockUseBalances.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		renderWithQuery(<BalanceCards address={addr} />);
		expect(
			screen.getByText("Unable to load balances. Please try again later."),
		).toBeInTheDocument();
	});
});
