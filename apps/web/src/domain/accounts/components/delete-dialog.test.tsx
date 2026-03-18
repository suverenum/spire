import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { DeleteDialog } from "./delete-dialog";

const mockPrepareDelete = vi.fn();
const mockConfirmDelete = vi.fn();
const mockToast = vi.fn();

vi.mock("../actions/delete-account", () => ({
	prepareDeleteAccount: (...args: unknown[]) => mockPrepareDelete(...args),
	confirmDeleteAccount: (...args: unknown[]) => mockConfirmDelete(...args),
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
	name: "Test Account",
	tokenSymbol: "AlphaUSD",
	tokenAddress: "0x1111111111111111111111111111111111111111" as `0x${string}`,
	walletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
	isDefault: false,
	createdAt: new Date("2025-01-01"),
	balance: 0n,
	balanceFormatted: "$0.00",
};

describe("DeleteDialog", () => {
	it("shows loading state initially", () => {
		mockPrepareDelete.mockReturnValue(new Promise(() => {}));
		render(
			<DeleteDialog
				open
				onClose={vi.fn()}
				account={account}
				onSuccess={vi.fn()}
			/>,
		);
		expect(screen.getByText("Checking account status...")).toBeInTheDocument();
	});

	it("shows ready state when balance is zero", async () => {
		mockPrepareDelete.mockResolvedValue({ status: "ready" });
		render(
			<DeleteDialog
				open
				onClose={vi.fn()}
				account={account}
				onSuccess={vi.fn()}
			/>,
		);
		await waitFor(() => {
			expect(
				screen.getByText(/Are you sure you want to delete/),
			).toBeInTheDocument();
		});
		expect(
			screen.getByRole("button", { name: "Delete Account" }),
		).toBeInTheDocument();
	});

	it("shows blocked state when assigned token has balance", async () => {
		mockPrepareDelete.mockResolvedValue({
			status: "blocked",
			assignedBalance: 5000000n,
			tokenSymbol: "AlphaUSD",
		});
		render(
			<DeleteDialog
				open
				onClose={vi.fn()}
				account={account}
				onSuccess={vi.fn()}
			/>,
		);
		await waitFor(() => {
			expect(screen.getByText("Cannot delete account")).toBeInTheDocument();
		});
		expect(screen.getByText(/\$5.00/)).toBeInTheDocument();
	});

	it("shows Transfer Balance button when blocked and handler provided", async () => {
		mockPrepareDelete.mockResolvedValue({
			status: "blocked",
			assignedBalance: 5000000n,
			tokenSymbol: "AlphaUSD",
		});
		const onTransfer = vi.fn();
		render(
			<DeleteDialog
				open
				onClose={vi.fn()}
				account={account}
				onSuccess={vi.fn()}
				onTransferBalance={onTransfer}
			/>,
		);
		await waitFor(() => {
			expect(screen.getByText("Transfer Balance")).toBeInTheDocument();
		});
		await userEvent.click(screen.getByText("Transfer Balance"));
		expect(onTransfer).toHaveBeenCalledWith(account);
	});

	it("shows warning state for unassigned assets", async () => {
		mockPrepareDelete.mockResolvedValue({
			status: "warn",
			unassignedBalances: [
				{
					tokenAddress: "0x2222222222222222222222222222222222222222",
					tokenSymbol: "BetaUSD",
					amount: 3000000n,
				},
			],
		});
		render(
			<DeleteDialog
				open
				onClose={vi.fn()}
				account={account}
				onSuccess={vi.fn()}
			/>,
		);
		await waitFor(() => {
			expect(
				screen.getByText("Unassigned assets detected"),
			).toBeInTheDocument();
		});
		expect(screen.getByText(/BetaUSD/)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Delete Anyway" }),
		).toBeInTheDocument();
	});

	it("calls confirmDelete with acknowledge on warn state", async () => {
		mockPrepareDelete.mockResolvedValue({
			status: "warn",
			unassignedBalances: [
				{
					tokenAddress: "0x2222222222222222222222222222222222222222",
					tokenSymbol: "BetaUSD",
					amount: 3000000n,
				},
			],
		});
		mockConfirmDelete.mockResolvedValue({ success: true });
		render(
			<DeleteDialog
				open
				onClose={vi.fn()}
				account={account}
				onSuccess={vi.fn()}
			/>,
		);
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Delete Anyway" }),
			).toBeInTheDocument();
		});
		await userEvent.click(
			screen.getByRole("button", { name: "Delete Anyway" }),
		);
		await waitFor(() => {
			expect(mockConfirmDelete).toHaveBeenCalledWith({
				accountId: "acc-1",
				acknowledgeUnassignedAssets: true,
			});
		});
	});

	it("calls confirmDelete on ready state", async () => {
		mockPrepareDelete.mockResolvedValue({ status: "ready" });
		mockConfirmDelete.mockResolvedValue({ success: true });
		const onSuccess = vi.fn();
		const onClose = vi.fn();
		render(
			<DeleteDialog
				open
				onClose={onClose}
				account={account}
				onSuccess={onSuccess}
			/>,
		);
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Delete Account" }),
			).toBeInTheDocument();
		});
		await userEvent.click(
			screen.getByRole("button", { name: "Delete Account" }),
		);
		await waitFor(() => {
			expect(mockConfirmDelete).toHaveBeenCalledWith({
				accountId: "acc-1",
				acknowledgeUnassignedAssets: false,
			});
			expect(onSuccess).toHaveBeenCalled();
		});
	});

	it("shows error from confirmDelete", async () => {
		mockPrepareDelete.mockResolvedValue({ status: "ready" });
		mockConfirmDelete.mockResolvedValue({
			error: "Account still has funds",
		});
		render(
			<DeleteDialog
				open
				onClose={vi.fn()}
				account={account}
				onSuccess={vi.fn()}
			/>,
		);
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Delete Account" }),
			).toBeInTheDocument();
		});
		await userEvent.click(
			screen.getByRole("button", { name: "Delete Account" }),
		);
		await waitFor(() => {
			expect(screen.getByText("Account still has funds")).toBeInTheDocument();
		});
	});

	it("shows error when prepare fails", async () => {
		mockPrepareDelete.mockRejectedValue(new Error("Network error"));
		render(
			<DeleteDialog
				open
				onClose={vi.fn()}
				account={account}
				onSuccess={vi.fn()}
			/>,
		);
		await waitFor(() => {
			expect(screen.getByText("Network error")).toBeInTheDocument();
		});
	});
});
