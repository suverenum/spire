import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { AccountGrid } from "./account-grid";

vi.mock("next/link", () => ({
	default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("./account-card", () => ({
	AccountCard: ({ account }: { account: AccountWithBalance }) => (
		<div data-testid={`card-${account.id}`}>{account.name}</div>
	),
}));

afterEach(cleanup);

function makeAccount(
	id: string,
	name: string,
	balance: bigint,
	createdAt = new Date("2025-01-01"),
): AccountWithBalance {
	return {
		id,
		treasuryId: "t-1",
		name,
		tokenSymbol: "AlphaUSD",
		tokenAddress: "0x1111111111111111111111111111111111111111" as `0x${string}`,
		walletAddress: `0x${id.padStart(40, "0")}` as `0x${string}`,
		isDefault: false,
		createdAt,
		balance,
		balanceFormatted: `$${Number(balance) / 1_000_000}`,
	};
}

describe("AccountGrid", () => {
	it("renders all accounts sorted by balance descending", () => {
		const accounts = [
			makeAccount("1", "Low", 100n),
			makeAccount("2", "High", 999999n),
			makeAccount("3", "Mid", 5000n),
		];
		render(<AccountGrid accounts={accounts} onRename={vi.fn()} onDelete={vi.fn()} />);
		const cards = screen.getAllByTestId(/^card-/);
		expect(cards).toHaveLength(3);
		expect(cards[0]).toHaveTextContent("High");
		expect(cards[1]).toHaveTextContent("Mid");
		expect(cards[2]).toHaveTextContent("Low");
	});

	it("limits displayed accounts with maxItems", () => {
		const accounts = [
			makeAccount("1", "A", 100n),
			makeAccount("2", "B", 200n),
			makeAccount("3", "C", 300n),
		];
		render(<AccountGrid accounts={accounts} maxItems={2} onRename={vi.fn()} onDelete={vi.fn()} />);
		expect(screen.getAllByTestId(/^card-/)).toHaveLength(2);
	});

	it("shows 'View all accounts' link when showViewAll and hasMore", () => {
		const accounts = [
			makeAccount("1", "A", 100n),
			makeAccount("2", "B", 200n),
			makeAccount("3", "C", 300n),
		];
		render(
			<AccountGrid
				accounts={accounts}
				maxItems={2}
				showViewAll
				onRename={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		expect(screen.getByText(/View all accounts/)).toBeInTheDocument();
	});

	it("does not show 'View all accounts' link when all fit", () => {
		const accounts = [makeAccount("1", "A", 100n), makeAccount("2", "B", 200n)];
		render(
			<AccountGrid
				accounts={accounts}
				maxItems={4}
				showViewAll
				onRename={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		expect(screen.queryByText(/View all accounts/)).not.toBeInTheDocument();
	});

	it("breaks ties by creation order (earlier first)", () => {
		const accounts = [
			makeAccount("1", "Later", 100n, new Date("2025-06-01")),
			makeAccount("2", "Earlier", 100n, new Date("2025-01-01")),
		];
		render(<AccountGrid accounts={accounts} onRename={vi.fn()} onDelete={vi.fn()} />);
		const cards = screen.getAllByTestId(/^card-/);
		expect(cards[0]).toHaveTextContent("Earlier");
		expect(cards[1]).toHaveTextContent("Later");
	});
});
