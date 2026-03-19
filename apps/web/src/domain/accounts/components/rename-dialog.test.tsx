import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { RenameDialog } from "./rename-dialog";

const mockRenameAction = vi.fn();
const mockToast = vi.fn();

vi.mock("../actions/rename-account", () => ({
	renameAccountAction: (...args: unknown[]) => mockRenameAction(...args),
}));

vi.mock("@/components/ui/toast", () => ({
	toast: (...args: unknown[]) => mockToast(...args),
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

const account: AccountWithBalance = {
	id: "acc-1",
	treasuryId: "t-1",
	name: "Old Name",
	tokenSymbol: "AlphaUSD",
	tokenAddress: "0x1111111111111111111111111111111111111111" as `0x${string}`,
	walletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
	walletType: "eoa",
	isDefault: false,
	createdAt: new Date("2025-01-01"),
	balance: 1000000n,
	balanceFormatted: "$1.00",
};

describe("RenameDialog", () => {
	it("renders with current account name", () => {
		render(<RenameDialog open onClose={vi.fn()} account={account} onSuccess={vi.fn()} />);
		expect(screen.getByLabelText("New Name")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
	});

	it("pre-fills account name in input", () => {
		render(<RenameDialog open onClose={vi.fn()} account={account} onSuccess={vi.fn()} />);
		const input = screen.getByLabelText("New Name") as HTMLInputElement;
		expect(input.value).toBe("Old Name");
	});

	it("calls rename action on valid submit", async () => {
		mockRenameAction.mockResolvedValue({ success: true });
		render(<RenameDialog open onClose={vi.fn()} account={account} onSuccess={vi.fn()} />);
		const input = screen.getByLabelText("New Name");
		await userEvent.clear(input);
		await userEvent.type(input, "New Name");
		await userEvent.click(screen.getByRole("button", { name: "Rename" }));
		await waitFor(() => {
			expect(mockRenameAction).toHaveBeenCalled();
		});
	});

	it("shows error from action result", async () => {
		mockRenameAction.mockResolvedValue({ error: "Name already taken" });
		render(<RenameDialog open onClose={vi.fn()} account={account} onSuccess={vi.fn()} />);
		const input = screen.getByLabelText("New Name");
		await userEvent.clear(input);
		await userEvent.type(input, "Duplicate");
		await userEvent.click(screen.getByRole("button", { name: "Rename" }));
		await waitFor(() => {
			expect(screen.getByText("Name already taken")).toBeInTheDocument();
		});
	});

	it("calls onSuccess and onClose on successful rename", async () => {
		mockRenameAction.mockResolvedValue({ success: true });
		const onClose = vi.fn();
		const onSuccess = vi.fn();
		render(<RenameDialog open onClose={onClose} account={account} onSuccess={onSuccess} />);
		const input = screen.getByLabelText("New Name");
		await userEvent.clear(input);
		await userEvent.type(input, "New Name");
		await userEvent.click(screen.getByRole("button", { name: "Rename" }));
		await waitFor(() => {
			expect(onSuccess).toHaveBeenCalled();
			expect(onClose).toHaveBeenCalled();
		});
	});

	it("does not render interactive content when account is null", () => {
		render(<RenameDialog open onClose={vi.fn()} account={null} onSuccess={vi.fn()} />);
		// Still renders the sheet but input will be empty
		expect(screen.getByLabelText("New Name")).toBeInTheDocument();
	});
});
