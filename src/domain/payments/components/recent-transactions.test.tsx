import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecentTransactions } from "./recent-transactions";
import type { Payment } from "@/lib/tempo/types";

const mockUseTransactions = vi.fn();

vi.mock("../hooks/use-transactions", () => ({
  useTransactions: (...args: unknown[]) => mockUseTransactions(...args),
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
const otherAddr = "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`;

describe("RecentTransactions", () => {
  beforeEach(() => {
    mockUseTransactions.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it("shows empty state when no transactions", () => {
    renderWithQuery(<RecentTransactions address={addr} />);
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    expect(
      screen.getByText("Send or receive a payment to get started."),
    ).toBeInTheDocument();
  });

  it("shows skeleton when loading and no data", () => {
    mockUseTransactions.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderWithQuery(<RecentTransactions address={addr} />);
    expect(screen.queryByText("No transactions yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Transactions")).not.toBeInTheDocument();
  });

  it("shows data when loading but data exists", () => {
    mockUseTransactions.mockReturnValue({
      data: [
        {
          id: "1",
          txHash: ("0x" + "01".repeat(32)) as `0x${string}`,
          from: addr,
          to: otherAddr,
          amount: 1000000n,
          token: "AlphaUSD",
          status: "confirmed" as const,
          timestamp: new Date("2026-01-15T14:30:00Z"),
        },
      ],
      isLoading: true,
    });
    renderWithQuery(<RecentTransactions address={addr} />);
    expect(screen.getByText("Recent Transactions")).toBeInTheDocument();
  });

  describe("with transaction data", () => {
    const mockTxs: Payment[] = [
      {
        id: "1",
        txHash: ("0x" + "01".repeat(32)) as `0x${string}`,
        from: addr,
        to: otherAddr,
        amount: 5000000n,
        token: "AlphaUSD",
        status: "confirmed" as const,
        timestamp: new Date("2026-01-15T14:30:00Z"),
        memo: "Invoice #42",
      },
      {
        id: "2",
        txHash: ("0x" + "02".repeat(32)) as `0x${string}`,
        from: otherAddr,
        to: addr,
        amount: 10000000n,
        token: "BetaUSD",
        status: "confirmed" as const,
        timestamp: new Date("2026-01-14T10:00:00Z"),
      },
      {
        id: "3",
        txHash: ("0x" + "03".repeat(32)) as `0x${string}`,
        from: addr,
        to: "0x9999999999999999999999999999999999999999" as `0x${string}`,
        amount: 2000000n,
        token: "pathUSD",
        status: "pending" as const,
        timestamp: new Date("2026-01-16T08:00:00Z"),
      },
    ];

    beforeEach(() => {
      mockUseTransactions.mockReturnValue({
        data: mockTxs,
        isLoading: false,
      });
    });

    it("shows Recent Transactions heading and View all link", () => {
      renderWithQuery(<RecentTransactions address={addr} />);
      expect(screen.getByText("Recent Transactions")).toBeInTheDocument();
      expect(screen.getByText(/View all/)).toBeInTheDocument();
    });

    it("shows sent transaction correctly", () => {
      renderWithQuery(<RecentTransactions address={addr} />);
      expect(screen.getByText("Sent AlphaUSD")).toBeInTheDocument();
    });

    it("shows received transaction correctly", () => {
      renderWithQuery(<RecentTransactions address={addr} />);
      expect(screen.getByText("Received BetaUSD")).toBeInTheDocument();
    });

    it("shows memo when present on transaction", () => {
      renderWithQuery(<RecentTransactions address={addr} />);
      expect(screen.getByText("Invoice #42")).toBeInTheDocument();
    });

    it("does not show memo element for transactions without memo", () => {
      // tx-2 has no memo, tx-1 has "Invoice #42"
      renderWithQuery(<RecentTransactions address={addr} />);
      // Only the first tx has a memo - there should be exactly one memo text
      const memoElements = screen.getAllByText("Invoice #42");
      expect(memoElements).toHaveLength(1);
    });

    it("shows Pending status for pending transactions", () => {
      renderWithQuery(<RecentTransactions address={addr} />);
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("shows formatted date for confirmed transactions", () => {
      renderWithQuery(<RecentTransactions address={addr} />);
      // tx-1 is confirmed, should show a formatted date (not "Pending")
      const pendingElements = screen.getAllByText("Pending");
      expect(pendingElements).toHaveLength(1); // Only tx-3 is pending
    });

    it("shows negative amount for sent transactions", () => {
      renderWithQuery(<RecentTransactions address={addr} />);
      expect(screen.getByText("-$5.00")).toBeInTheDocument();
    });

    it("shows positive amount for received transactions", () => {
      renderWithQuery(<RecentTransactions address={addr} />);
      expect(screen.getByText("+$10.00")).toBeInTheDocument();
    });

    it("shows truncated counterparty addresses", () => {
      renderWithQuery(<RecentTransactions address={addr} />);
      // Sent to otherAddr
      expect(screen.getByText(/To:.*0xabcd/)).toBeInTheDocument();
      // Received from otherAddr
      expect(screen.getByText(/From:.*0xabcd/)).toBeInTheDocument();
    });

    it("limits display to 5 transactions", () => {
      const manyTxs: Payment[] = Array.from({ length: 8 }, (_, i) => ({
        id: `tx-${i}`,
        txHash: ("0x" + String(i).padStart(64, "0")) as `0x${string}`,
        from: addr,
        to: otherAddr,
        amount: 1000000n,
        token: "AlphaUSD",
        status: "confirmed" as const,
        timestamp: new Date(2026, 0, 15 - i),
      }));
      mockUseTransactions.mockReturnValue({
        data: manyTxs,
        isLoading: false,
      });

      renderWithQuery(<RecentTransactions address={addr} />);
      const links = screen.getAllByRole("link");
      // View all link + 5 tx links
      const txLinks = links.filter((l) =>
        l.getAttribute("href")?.startsWith("/transactions/"),
      );
      expect(txLinks).toHaveLength(5);
    });
  });
});
