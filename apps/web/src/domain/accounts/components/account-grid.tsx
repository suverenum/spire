"use client";

import Link from "next/link";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { AccountCard } from "./account-card";

interface AccountGridProps {
	accounts: AccountWithBalance[];
	maxItems?: number;
	showViewAll?: boolean;
	onRename: (account: AccountWithBalance) => void;
	onDelete: (account: AccountWithBalance) => void;
}

export function AccountGrid({
	accounts,
	maxItems,
	showViewAll = false,
	onRename,
	onDelete,
}: AccountGridProps) {
	const sorted = [...accounts].sort((a, b) => {
		const diff = b.balance - a.balance;
		if (diff !== 0n) return diff > 0n ? 1 : -1;
		return a.createdAt.getTime() - b.createdAt.getTime();
	});

	const displayed = maxItems ? sorted.slice(0, maxItems) : sorted;
	const hasMore = maxItems ? sorted.length > maxItems : false;

	return (
		<div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{displayed.map((account) => (
					<AccountCard
						key={account.id}
						account={account}
						onRename={onRename}
						onDelete={onDelete}
					/>
				))}
			</div>
			{showViewAll && hasMore && (
				<div className="mt-3 text-center">
					<Link
						href="/accounts"
						className="text-sm text-gray-500 hover:text-gray-700"
					>
						View all accounts &rarr;
					</Link>
				</div>
			)}
		</div>
	);
}
