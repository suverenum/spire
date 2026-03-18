"use client";

import type { AccountWithBalance } from "@/lib/tempo/types";
import { formatBalance } from "@/lib/utils";

interface AccountSelectorProps {
	accounts: AccountWithBalance[];
	selectedAccountId: string | undefined;
	onSelect: (accountId: string) => void;
	label?: string;
	filterToken?: string;
	excludeToken?: string;
	excludeAccountId?: string;
}

export function AccountSelector({
	accounts,
	selectedAccountId,
	onSelect,
	label = "Account",
	filterToken,
	excludeToken,
	excludeAccountId,
}: AccountSelectorProps) {
	const filtered = accounts.filter((a) => {
		if (filterToken && a.tokenSymbol !== filterToken) return false;
		if (excludeToken && a.tokenSymbol === excludeToken) return false;
		if (excludeAccountId && a.id === excludeAccountId) return false;
		return true;
	});

	const selectId = `account-selector-${label.toLowerCase().replace(/\s+/g, "-")}`;

	return (
		<div>
			<label htmlFor={selectId} className="mb-1 block text-sm font-medium">
				{label}
			</label>
			<select
				id={selectId}
				value={selectedAccountId ?? ""}
				onChange={(e) => onSelect(e.target.value)}
				className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
			>
				<option value="" disabled>
					Select account
				</option>
				{filtered.map((account) => (
					<option key={account.id} value={account.id}>
						{account.name} ({account.tokenSymbol}) - $
						{formatBalance(account.balance, 6)}
					</option>
				))}
			</select>
		</div>
	);
}
