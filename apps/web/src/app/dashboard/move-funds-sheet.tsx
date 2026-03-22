"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { AccountSelector } from "@/domain/accounts/components/account-selector";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { formatBalance } from "@/lib/utils";

interface MoveFundsSheetProps {
	open: boolean;
	onClose: () => void;
	accounts: AccountWithBalance[];
	fromId: string;
	onFromSelect: (id: string) => void;
	toId: string;
	onToSelect: (id: string) => void;
	fromAccount: AccountWithBalance | undefined;
	amount: string;
	onAmountChange: (v: string) => void;
	error: string;
	onSubmit: () => void;
	isPending: boolean;
}

export function MoveFundsSheet({
	open,
	onClose,
	accounts,
	fromId,
	onFromSelect,
	toId,
	onToSelect,
	fromAccount,
	amount,
	onAmountChange,
	error,
	onSubmit,
	isPending,
}: MoveFundsSheetProps) {
	return (
		<Sheet open={open} onClose={onClose} title="Move Funds">
			<div className="space-y-4">
				<AccountSelector
					accounts={accounts}
					selectedAccountId={fromId}
					onSelect={onFromSelect}
					label="From"
				/>
				{fromAccount && (
					<p className="text-muted-foreground text-xs">
						Available: {formatBalance(fromAccount.balance, 6)} {fromAccount.tokenSymbol}
					</p>
				)}
				<AccountSelector
					accounts={accounts}
					selectedAccountId={toId}
					onSelect={onToSelect}
					label="To"
					excludeAccountId={fromId}
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
						value={amount}
						onChange={(e) => onAmountChange(e.target.value)}
					/>
				</div>
				{error && <p className="text-sm text-red-600">{error}</p>}
				<Button onClick={onSubmit} disabled={isPending} className="w-full" size="lg">
					{isPending ? "Moving..." : "Move"}
				</Button>
			</div>
		</Sheet>
	);
}
