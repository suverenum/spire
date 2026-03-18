"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { truncateAddress } from "@/lib/utils";
import { AccountMenu } from "./account-menu";

interface AccountCardProps {
	account: AccountWithBalance;
	onRename: (account: AccountWithBalance) => void;
	onDelete: (account: AccountWithBalance) => void;
}

export function AccountCard({ account, onRename, onDelete }: AccountCardProps) {
	return (
		<div
			data-testid="account-card"
			className="relative rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
		>
			<div className="mb-3 flex items-start justify-between">
				<Link
					href={`/accounts/${account.id}`}
					className="flex items-center gap-2"
				>
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
						<Wallet className="h-4 w-4 text-gray-600" />
					</div>
					<div>
						<p className="text-sm font-medium text-gray-900">{account.name}</p>
						<p className="text-xs text-gray-500">{account.tokenSymbol}</p>
					</div>
				</Link>
				<AccountMenu
					account={account}
					onRename={() => onRename(account)}
					onDelete={() => onDelete(account)}
				/>
			</div>
			<Link href={`/accounts/${account.id}`}>
				<p className="text-xl font-semibold">{account.balanceFormatted}</p>
				<p className="mt-1 text-xs text-gray-400">
					{truncateAddress(account.walletAddress)}
				</p>
			</Link>
		</div>
	);
}
