"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { formatBalance } from "@/lib/utils";
import { confirmDeleteAccount, prepareDeleteAccount } from "../actions/delete-account";

interface DeleteDialogProps {
	open: boolean;
	onClose: () => void;
	account: AccountWithBalance | null;
	onSuccess: () => void;
	onTransferBalance?: (account: AccountWithBalance) => void;
}

type DeleteState =
	| { type: "loading" }
	| { type: "blocked"; assignedBalance: bigint; tokenSymbol: string }
	| {
			type: "warn";
			unassignedBalances: {
				tokenAddress: string;
				tokenSymbol: string;
				amount: bigint;
			}[];
	  }
	| { type: "ready" }
	| { type: "error"; message: string };

export function DeleteDialog({
	open,
	onClose,
	account,
	onSuccess,
	onTransferBalance,
}: DeleteDialogProps) {
	const [state, setState] = useState<DeleteState>({ type: "loading" });
	const [isPending, setIsPending] = useState(false);

	useEffect(() => {
		if (!open || !account) return;
		setState({ type: "loading" });

		prepareDeleteAccount(account.id)
			.then((result) => {
				if (result.status === "blocked") {
					setState({
						type: "blocked",
						assignedBalance: result.assignedBalance,
						tokenSymbol: result.tokenSymbol,
					});
				} else if (result.status === "warn") {
					setState({
						type: "warn",
						unassignedBalances: result.unassignedBalances,
					});
				} else {
					setState({ type: "ready" });
				}
			})
			.catch((err) => {
				setState({
					type: "error",
					message: err instanceof Error ? err.message : "Failed to check account",
				});
			});
	}, [open, account]);

	async function handleDelete(acknowledgeUnassigned = false) {
		if (!account) return;
		setIsPending(true);
		try {
			const result = await confirmDeleteAccount({
				accountId: account.id,
				acknowledgeUnassignedAssets: acknowledgeUnassigned,
			});
			if (result.error) {
				setState({ type: "error", message: result.error });
			} else {
				toast("Account deleted", "success");
				onSuccess();
				onClose();
			}
		} finally {
			setIsPending(false);
		}
	}

	return (
		<Sheet open={open} onClose={onClose} title="Delete Account">
			<div className="space-y-4">
				{state.type === "loading" && (
					<p className="text-sm text-gray-500">Checking account status...</p>
				)}

				{state.type === "blocked" && (
					<div>
						<div className="flex items-center gap-2 text-red-600">
							<AlertTriangle className="h-5 w-5" />
							<p className="text-sm font-medium">Cannot delete account</p>
						</div>
						<p className="mt-2 text-sm text-gray-600">
							This account still holds ${formatBalance(state.assignedBalance, 6)}{" "}
							{state.tokenSymbol}. Transfer the balance before deleting.
						</p>
						{account && onTransferBalance && (
							<Button
								onClick={() => {
									onTransferBalance(account);
									onClose();
								}}
								className="mt-3 w-full"
								variant="outline"
							>
								Transfer Balance
							</Button>
						)}
					</div>
				)}

				{state.type === "warn" && (
					<div>
						<div className="flex items-center gap-2 text-yellow-600">
							<AlertTriangle className="h-5 w-5" />
							<p className="text-sm font-medium">Unassigned assets detected</p>
						</div>
						<p className="mt-2 text-sm text-gray-600">
							This wallet contains tokens not tracked by this account. They will remain on-chain but
							inaccessible through the app.
						</p>
						<div className="mt-2 space-y-1">
							{state.unassignedBalances.map((b) => (
								<p key={b.tokenAddress} className="text-xs text-gray-500">
									{b.tokenSymbol}: ${formatBalance(b.amount, 6)}
								</p>
							))}
						</div>
						<Button
							onClick={() => handleDelete(true)}
							disabled={isPending}
							className="mt-3 w-full"
							variant="destructive"
						>
							{isPending ? "Deleting..." : "Delete Anyway"}
						</Button>
					</div>
				)}

				{state.type === "ready" && (
					<div>
						<p className="text-sm text-gray-600">
							Are you sure you want to delete <span className="font-medium">{account?.name}</span>?
							This action cannot be undone.
						</p>
						<Button
							onClick={() => handleDelete(false)}
							disabled={isPending}
							className="mt-3 w-full"
							variant="destructive"
						>
							{isPending ? "Deleting..." : "Delete Account"}
						</Button>
					</div>
				)}

				{state.type === "error" && <p className="text-sm text-red-600">{state.message}</p>}
			</div>
		</Sheet>
	);
}
