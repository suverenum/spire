import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Payment } from "@/lib/tempo/types";
import { TransactionList } from "./transaction-list";

const mockUseTransactions = vi.fn();

vi.mock("../hooks/use-transactions", () => ({
	useTransactions: (...args: unknown[]) => mockUseTransactions(...args),
}));

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

function renderWithQuery(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const addr = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;
const otherAddr = "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`;

const mockTransactions: Payment[] = [
	{
		id: "tx-1",
		txHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
		from: addr,
		to: otherAddr,
		amount: 5000000n,
		token: "AlphaUSD",
		status: "confirmed",
		timestamp: new Date("2026-01-15T14:30:00Z"),
		memo: "Invoice #42",
	},
	{
		id: "tx-2",
		txHash: "0x0000000000000000000000000000000000000000000000000000000000000002",
		from: otherAddr,
		to: addr,
		amount: 10000000n,
		token: "BetaUSD",
		status: "confirmed",
		timestamp: new Date("2026-01-14T10:00:00Z"),
	},
	{
		id: "tx-3",
		txHash: "0x0000000000000000000000000000000000000000000000000000000000000003",
		from: addr,
		to: "0x9999999999999999999999999999999999999999" as `0x${string}`,
		amount: 2000000n,
		token: "pathUSD",
		status: "pending",
		timestamp: new Date("2026-01-16T08:00:00Z"),
	},
];

describe("TransactionList", () => {
	beforeEach(() => {
		mockUseTransactions.mockReturnValue({
			data: [],
			isLoading: false,
		});
	});

	it("shows empty state when no transactions", () => {
		renderWithQuery(<TransactionList address={addr} />);
		expect(screen.getByText("No transactions yet")).toBeInTheDocument();
	});

	it("renders search input", () => {
		renderWithQuery(<TransactionList address={addr} />);
		expect(screen.getByPlaceholderText("Search by address...")).toBeInTheDocument();
	});

	it("renders tab filters with counts", () => {
		renderWithQuery(<TransactionList address={addr} />);
		expect(screen.getByText("All (0)")).toBeInTheDocument();
		expect(screen.getByText("Sent (0)")).toBeInTheDocument();
		expect(screen.getByText("Received (0)")).toBeInTheDocument();
	});

	it("shows dashboard link in empty state", () => {
		renderWithQuery(<TransactionList address={addr} />);
		expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
	});

	it("handles null data by falling back to empty array", () => {
		mockUseTransactions.mockReturnValue({
			data: null,
			isLoading: false,
		});
		renderWithQuery(<TransactionList address={addr} />);
		expect(screen.getByText("No transactions yet")).toBeInTheDocument();
		expect(screen.getByText("All (0)")).toBeInTheDocument();
	});

	it("shows loading skeleton when isLoading is true and no data", () => {
		mockUseTransactions.mockReturnValue({
			data: undefined,
			isLoading: true,
		});
		renderWithQuery(<TransactionList address={addr} />);
		// TransactionSkeleton renders skeleton items instead of the main UI
		expect(screen.queryByText("No transactions yet")).not.toBeInTheDocument();
		expect(screen.queryByPlaceholderText("Search by address...")).not.toBeInTheDocument();
	});

	it("does not show skeleton when isLoading is true but data exists", () => {
		mockUseTransactions.mockReturnValue({
			data: mockTransactions,
			isLoading: true,
		});
		renderWithQuery(<TransactionList address={addr} />);
		expect(screen.getByPlaceholderText("Search by address...")).toBeInTheDocument();
	});

	describe("with transaction data", () => {
		beforeEach(() => {
			mockUseTransactions.mockReturnValue({
				data: mockTransactions,
				isLoading: false,
			});
		});

		it("renders transaction rows in All tab", () => {
			renderWithQuery(<TransactionList address={addr} />);
			expect(screen.getByText("All (3)")).toBeInTheDocument();
			expect(screen.getByText("Sent (2)")).toBeInTheDocument();
			expect(screen.getByText("Received (1)")).toBeInTheDocument();
		});

		it("renders sent transaction with correct details", () => {
			renderWithQuery(<TransactionList address={addr} />);
			// tx-1 is sent from addr
			const sentLabels = screen.getAllByText(/Sent/);
			expect(sentLabels.length).toBeGreaterThan(0);
		});

		it("renders received transaction with correct details", () => {
			renderWithQuery(<TransactionList address={addr} />);
			const receivedLabels = screen.getAllByText(/Received/);
			expect(receivedLabels.length).toBeGreaterThan(0);
		});

		it("shows memo on transaction row when present", () => {
			renderWithQuery(<TransactionList address={addr} />);
			expect(screen.getByText("Invoice #42")).toBeInTheDocument();
		});

		it("shows Pending status for pending transactions", () => {
			renderWithQuery(<TransactionList address={addr} />);
			expect(screen.getByText("Pending")).toBeInTheDocument();
		});

		it("displays formatted amounts with sign", () => {
			renderWithQuery(<TransactionList address={addr} />);
			// Sent tx: -$5.00, Received tx: +$10.00
			expect(screen.getByText("-$5.00")).toBeInTheDocument();
			expect(screen.getByText("+$10.00")).toBeInTheDocument();
		});

		it("renders truncated counterparty addresses", () => {
			renderWithQuery(<TransactionList address={addr} />);
			// For sent tx-1, counterparty is otherAddr: 0xabcd...ef12
			expect(screen.getByText(/To:.*0xabcd/)).toBeInTheDocument();
			// For received tx-2, counterparty is otherAddr: 0xabcd...ef12
			expect(screen.getByText(/From:.*0xabcd/)).toBeInTheDocument();
		});

		it("links transaction rows to detail pages", () => {
			renderWithQuery(<TransactionList address={addr} />);
			const links = screen.getAllByRole("link");
			// Filter out the "Go to Dashboard" link -- tx rows are links too
			const txLinks = links.filter((link) =>
				link.getAttribute("href")?.startsWith("/transactions/"),
			);
			expect(txLinks.length).toBe(3);
			expect(txLinks[0]).toHaveAttribute("href", "/transactions/tx-1");
		});
	});

	describe("tab switching", () => {
		beforeEach(() => {
			mockUseTransactions.mockReturnValue({
				data: mockTransactions,
				isLoading: false,
			});
		});

		it("switches to Sent tab and shows only sent transactions", () => {
			renderWithQuery(<TransactionList address={addr} />);
			const sentTab = screen.getByRole("tab", { name: /Sent/ });
			fireEvent.click(sentTab);

			// Sent tab should be active
			expect(sentTab).toHaveAttribute("aria-selected", "true");

			// The sent tab panel should show sent transactions
			const tabPanel = screen.getByRole("tabpanel");
			expect(tabPanel).toBeInTheDocument();
		});

		it("switches to Received tab and shows only received transactions", () => {
			renderWithQuery(<TransactionList address={addr} />);
			const receivedTab = screen.getByRole("tab", { name: /Received/ });
			fireEvent.click(receivedTab);

			expect(receivedTab).toHaveAttribute("aria-selected", "true");
			const tabPanel = screen.getByRole("tabpanel");
			expect(tabPanel).toBeInTheDocument();
		});

		it("shows empty state in Sent tab when no sent transactions", () => {
			mockUseTransactions.mockReturnValue({
				data: [mockTransactions[1]], // only the received tx
				isLoading: false,
			});
			renderWithQuery(<TransactionList address={addr} />);
			const sentTab = screen.getByRole("tab", { name: /Sent/ });
			fireEvent.click(sentTab);
			expect(screen.getByText("No transactions yet")).toBeInTheDocument();
		});

		it("shows empty state in Received tab when no received transactions", () => {
			mockUseTransactions.mockReturnValue({
				data: [mockTransactions[0]], // only a sent tx
				isLoading: false,
			});
			renderWithQuery(<TransactionList address={addr} />);
			const receivedTab = screen.getByRole("tab", { name: /Received/ });
			fireEvent.click(receivedTab);
			expect(screen.getByText("No transactions yet")).toBeInTheDocument();
		});
	});

	describe("infinite scroll", () => {
		let intersectionCallbacks: Array<(entries: { isIntersecting: boolean }[]) => void>;

		beforeEach(() => {
			intersectionCallbacks = [];
			vi.stubGlobal(
				"IntersectionObserver",
				class {
					constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
						intersectionCallbacks.push(callback);
					}
					observe() {}
					disconnect() {}
				},
			);

			// Generate 25 transactions (more than PAGE_SIZE of 20)
			const manyTransactions: Payment[] = Array.from({ length: 25 }, (_, i) => ({
				id: `tx-${i}`,
				txHash: `0x${"0".repeat(63)}${i}` as `0x${string}`,
				from: addr,
				to: otherAddr,
				amount: BigInt((i + 1) * 1000000),
				token: "AlphaUSD",
				status: "confirmed" as const,
				timestamp: new Date(2026, 0, 15, 12, 0, 0, 0),
			}));

			mockUseTransactions.mockReturnValue({
				data: manyTransactions,
				isLoading: false,
			});
		});

		it("initially shows PAGE_SIZE items and loads more on intersection", () => {
			renderWithQuery(<TransactionList address={addr} />);

			// Should show 25 total but only render first 20
			expect(screen.getByText("All (25)")).toBeInTheDocument();
			const links = screen
				.getAllByRole("link")
				.filter((l) => l.getAttribute("href")?.startsWith("/transactions/"));
			expect(links.length).toBe(20);

			// Trigger the last registered intersection observer callback
			const lastCallback = intersectionCallbacks[intersectionCallbacks.length - 1];
			act(() => {
				lastCallback([{ isIntersecting: true }]);
			});

			// Now should show all 25
			const updatedLinks = screen
				.getAllByRole("link")
				.filter((l) => l.getAttribute("href")?.startsWith("/transactions/"));
			expect(updatedLinks.length).toBe(25);
		});
	});

	describe("search filtering", () => {
		beforeEach(() => {
			mockUseTransactions.mockReturnValue({
				data: mockTransactions,
				isLoading: false,
			});
		});

		it("filters transactions by address", () => {
			renderWithQuery(<TransactionList address={addr} />);
			const searchInput = screen.getByPlaceholderText("Search by address...");
			fireEvent.change(searchInput, { target: { value: "9999" } });

			// Only tx-3 has address containing 9999
			expect(screen.getByText("All (1)")).toBeInTheDocument();
		});

		it("filters transactions by memo", () => {
			renderWithQuery(<TransactionList address={addr} />);
			const searchInput = screen.getByPlaceholderText("Search by address...");
			fireEvent.change(searchInput, { target: { value: "invoice" } });

			// Only tx-1 has memo "Invoice #42"
			expect(screen.getByText("All (1)")).toBeInTheDocument();
		});

		it("shows empty state when search matches nothing", () => {
			renderWithQuery(<TransactionList address={addr} />);
			const searchInput = screen.getByPlaceholderText("Search by address...");
			fireEvent.change(searchInput, {
				target: { value: "nonexistentquery" },
			});

			expect(screen.getByText("All (0)")).toBeInTheDocument();
			expect(screen.getByText("No transactions yet")).toBeInTheDocument();
		});

		it("search is case-insensitive", () => {
			renderWithQuery(<TransactionList address={addr} />);
			const searchInput = screen.getByPlaceholderText("Search by address...");
			fireEvent.change(searchInput, { target: { value: "ABCDEF" } });

			// Both tx-1 and tx-2 involve otherAddr which contains "abcdef"
			// tx-1: from=addr, to=otherAddr  -> "to" contains abcdef
			// tx-2: from=otherAddr, to=addr  -> "from" contains abcdef
			// Also addr contains "abcdef" so all 3 match
			expect(screen.getByText(/All \(3\)/)).toBeInTheDocument();
		});

		it("updates sent and received counts based on filter", () => {
			renderWithQuery(<TransactionList address={addr} />);
			const searchInput = screen.getByPlaceholderText("Search by address...");
			fireEvent.change(searchInput, { target: { value: "9999" } });

			// Only tx-3 matches (sent to 0x9999...)
			expect(screen.getByText("Sent (1)")).toBeInTheDocument();
			expect(screen.getByText("Received (0)")).toBeInTheDocument();
		});
	});
});
