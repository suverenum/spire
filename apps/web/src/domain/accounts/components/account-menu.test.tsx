import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { AccountMenu } from "./account-menu";

afterEach(cleanup);

function makeAccount(isDefault: boolean): AccountWithBalance {
	return {
		id: "acc-1",
		treasuryId: "t-1",
		name: "Test Account",
		tokenSymbol: "AlphaUSD",
		tokenAddress: "0x1111111111111111111111111111111111111111" as `0x${string}`,
		walletAddress:
			"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
		isDefault,
		createdAt: new Date("2025-01-01"),
		balance: 1000000n,
		balanceFormatted: "$1.00",
	};
}

describe("AccountMenu", () => {
	it("renders the menu button", () => {
		render(
			<AccountMenu
				account={makeAccount(false)}
				onRename={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		expect(screen.getByLabelText("Account actions")).toBeInTheDocument();
	});

	it("opens menu on click", async () => {
		render(
			<AccountMenu
				account={makeAccount(false)}
				onRename={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		await userEvent.click(screen.getByLabelText("Account actions"));
		expect(screen.getByText("Rename")).toBeInTheDocument();
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("hides Delete option for default accounts", async () => {
		render(
			<AccountMenu
				account={makeAccount(true)}
				onRename={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		await userEvent.click(screen.getByLabelText("Account actions"));
		expect(screen.getByText("Rename")).toBeInTheDocument();
		expect(screen.queryByText("Delete")).not.toBeInTheDocument();
	});

	it("calls onRename and closes menu", async () => {
		const onRename = vi.fn();
		render(
			<AccountMenu
				account={makeAccount(false)}
				onRename={onRename}
				onDelete={vi.fn()}
			/>,
		);
		await userEvent.click(screen.getByLabelText("Account actions"));
		await userEvent.click(screen.getByText("Rename"));
		expect(onRename).toHaveBeenCalledOnce();
		expect(screen.queryByText("Rename")).not.toBeInTheDocument();
	});

	it("calls onDelete and closes menu", async () => {
		const onDelete = vi.fn();
		render(
			<AccountMenu
				account={makeAccount(false)}
				onRename={vi.fn()}
				onDelete={onDelete}
			/>,
		);
		await userEvent.click(screen.getByLabelText("Account actions"));
		await userEvent.click(screen.getByText("Delete"));
		expect(onDelete).toHaveBeenCalledOnce();
		expect(screen.queryByText("Delete")).not.toBeInTheDocument();
	});

	it("closes menu when clicking outside overlay", async () => {
		render(
			<AccountMenu
				account={makeAccount(false)}
				onRename={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		await userEvent.click(screen.getByLabelText("Account actions"));
		expect(screen.getByText("Rename")).toBeInTheDocument();
		// Click the overlay
		await userEvent.click(screen.getByLabelText("Close menu"));
		expect(screen.queryByText("Rename")).not.toBeInTheDocument();
	});
});
