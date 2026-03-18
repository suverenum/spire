import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { AccountCard } from "./account-card";

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...props
	}: {
		href: string;
		children: React.ReactNode;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("./account-menu", () => ({
	AccountMenu: ({
		onRename,
		onDelete,
	}: {
		onRename: () => void;
		onDelete: () => void;
	}) => (
		<div data-testid="account-menu">
			<button type="button" onClick={onRename}>
				rename
			</button>
			<button type="button" onClick={onDelete}>
				delete
			</button>
		</div>
	),
}));

afterEach(cleanup);

const account: AccountWithBalance = {
	id: "acc-1",
	treasuryId: "t-1",
	name: "Main AlphaUSD",
	tokenSymbol: "AlphaUSD",
	tokenAddress: "0x1111111111111111111111111111111111111111" as `0x${string}`,
	walletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
	isDefault: true,
	createdAt: new Date("2025-01-01"),
	balance: 1000000n,
	balanceFormatted: "$1.00",
};

describe("AccountCard", () => {
	it("renders account name and token symbol", () => {
		render(
			<AccountCard account={account} onRename={vi.fn()} onDelete={vi.fn()} />,
		);
		expect(screen.getByText("Main AlphaUSD")).toBeInTheDocument();
		expect(screen.getByText("AlphaUSD")).toBeInTheDocument();
	});

	it("renders formatted balance", () => {
		render(
			<AccountCard account={account} onRename={vi.fn()} onDelete={vi.fn()} />,
		);
		expect(screen.getByText("$1.00")).toBeInTheDocument();
	});

	it("renders truncated wallet address", () => {
		render(
			<AccountCard account={account} onRename={vi.fn()} onDelete={vi.fn()} />,
		);
		expect(screen.getByText("0xaaaa...aaaa")).toBeInTheDocument();
	});

	it("links to account detail page", () => {
		render(
			<AccountCard account={account} onRename={vi.fn()} onDelete={vi.fn()} />,
		);
		const links = screen.getAllByRole("link");
		expect(links[0]).toHaveAttribute("href", "/accounts/acc-1");
	});

	it("calls onRename when rename is triggered", async () => {
		const onRename = vi.fn();
		render(
			<AccountCard account={account} onRename={onRename} onDelete={vi.fn()} />,
		);
		await userEvent.click(screen.getByText("rename"));
		expect(onRename).toHaveBeenCalledWith(account);
	});

	it("calls onDelete when delete is triggered", async () => {
		const onDelete = vi.fn();
		render(
			<AccountCard account={account} onRename={vi.fn()} onDelete={onDelete} />,
		);
		await userEvent.click(screen.getByText("delete"));
		expect(onDelete).toHaveBeenCalledWith(account);
	});
});
