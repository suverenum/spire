import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { AccountSelector } from "./account-selector";

afterEach(cleanup);

function makeAccount(
	id: string,
	name: string,
	tokenSymbol: string,
	balance = 1000000n,
): AccountWithBalance {
	return {
		id,
		treasuryId: "t-1",
		name,
		tokenSymbol,
		tokenAddress: `0x${id.padStart(40, "1")}` as `0x${string}`,
		walletAddress: `0x${id.padStart(40, "a")}` as `0x${string}`,
		isDefault: false,
		createdAt: new Date("2025-01-01"),
		balance,
		balanceFormatted: `$${Number(balance) / 1_000_000}`,
	};
}

const accounts = [
	makeAccount("1", "Main Alpha", "AlphaUSD", 5000000n),
	makeAccount("2", "Main Beta", "BetaUSD", 3000000n),
	makeAccount("3", "Ops Alpha", "AlphaUSD", 1000000n),
];

describe("AccountSelector", () => {
	it("renders label and all accounts as options", () => {
		render(
			<AccountSelector
				accounts={accounts}
				selectedAccountId={undefined}
				onSelect={vi.fn()}
			/>,
		);
		expect(screen.getByLabelText("Account")).toBeInTheDocument();
		expect(screen.getByText("Select account")).toBeInTheDocument();
		const options = screen.getAllByRole("option");
		// 3 accounts + 1 disabled placeholder
		expect(options).toHaveLength(4);
	});

	it("filters by token when filterToken is set", () => {
		render(
			<AccountSelector
				accounts={accounts}
				selectedAccountId={undefined}
				onSelect={vi.fn()}
				filterToken="AlphaUSD"
			/>,
		);
		const options = screen.getAllByRole("option");
		// 2 AlphaUSD accounts + 1 placeholder
		expect(options).toHaveLength(3);
		expect(screen.getByText(/Main Alpha/)).toBeInTheDocument();
		expect(screen.getByText(/Ops Alpha/)).toBeInTheDocument();
		expect(screen.queryByText(/Main Beta/)).not.toBeInTheDocument();
	});

	it("excludes account by ID when excludeAccountId is set", () => {
		render(
			<AccountSelector
				accounts={accounts}
				selectedAccountId={undefined}
				onSelect={vi.fn()}
				excludeAccountId="1"
			/>,
		);
		const options = screen.getAllByRole("option");
		// 2 remaining accounts + 1 placeholder
		expect(options).toHaveLength(3);
		expect(screen.queryByText(/Main Alpha/)).not.toBeInTheDocument();
	});

	it("calls onSelect when selection changes", async () => {
		const onSelect = vi.fn();
		render(
			<AccountSelector
				accounts={accounts}
				selectedAccountId={undefined}
				onSelect={onSelect}
			/>,
		);
		await userEvent.selectOptions(screen.getByRole("combobox"), "1");
		expect(onSelect).toHaveBeenCalledWith("1");
	});

	it("uses custom label", () => {
		render(
			<AccountSelector
				accounts={accounts}
				selectedAccountId={undefined}
				onSelect={vi.fn()}
				label="From"
			/>,
		);
		expect(screen.getByLabelText("From")).toBeInTheDocument();
	});

	it("shows selected account", () => {
		render(
			<AccountSelector
				accounts={accounts}
				selectedAccountId="2"
				onSelect={vi.fn()}
			/>,
		);
		const select = screen.getByRole("combobox") as HTMLSelectElement;
		expect(select.value).toBe("2");
	});
});
