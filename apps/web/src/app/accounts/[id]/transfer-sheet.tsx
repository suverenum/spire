"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { AccountSelector } from "@/domain/accounts/components/account-selector";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { formatBalance } from "@/lib/utils";

interface TransferSheetProps {
	open: boolean;
	onClose: () => void;
	accountName: string;
	accountBalance: bigint;
	accountTokenSymbol: string;
	accountId: string;
	accounts: AccountWithBalance[];
	transferToId: string;
	onTransferToSelect: (id: string) => void;
	transferAmount: string;
	onTransferAmountChange: (amount: string) => void;
	transferError: string;
	onTransfer: () => void;
	isPending: boolean;
}

export function TransferSheet({
	open,
	onClose,
	accountName,
	accountBalance,
	accountTokenSymbol,
	accountId,
	accounts,
	transferToId,
	onTransferToSelect,
	transferAmount,
	onTransferAmountChange,
	transferError,
	onTransfer,
	isPending,
}: TransferSheetProps) {
	return (
		<Sheet open={open} onClose={onClose} title="Internal Transfer">
			<div className="space-y-4">
				<div>
					<p className="text-muted-foreground text-sm">
						From: {accountName} (${formatBalance(accountBalance, 6)})
					</p>
				</div>
				<AccountSelector
					accounts={accounts}
					selectedAccountId={transferToId}
					onSelect={onTransferToSelect}
					label="To"
					filterToken={accountTokenSymbol}
					excludeAccountId={accountId}
				/>
				<div>
					<label htmlFor="transfer-amount" className="mb-1 block text-sm font-medium">
						Amount
					</label>
					<Input
						id="transfer-amount"
						type="text"
						inputMode="decimal"
						placeholder="0.00"
						value={transferAmount}
						onChange={(e) => onTransferAmountChange(e.target.value)}
					/>
				</div>
				{transferError && <p className="text-sm text-red-600">{transferError}</p>}
				<Button onClick={onTransfer} disabled={isPending} className="w-full" size="lg">
					{isPending ? "Transferring..." : "Transfer"}
				</Button>
			</div>
		</Sheet>
	);
}
