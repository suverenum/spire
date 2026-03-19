"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { WalletIcon } from "@/components/icons";
import { MultisigBadge } from "@/domain/multisig/components/multisig-badge";
import { getMultisigConfig } from "@/domain/multisig/queries/get-multisig-config";
import { getPendingTransactions } from "@/domain/multisig/queries/get-pending-transactions";
import { CACHE_KEYS } from "@/lib/constants";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { truncateAddress } from "@/lib/utils";
import { AccountMenu } from "./account-menu";

interface AccountCardProps {
	account: AccountWithBalance;
	onRename: (account: AccountWithBalance) => void;
	onDelete: (account: AccountWithBalance) => void;
}

export function AccountCard({ account, onRename, onDelete }: AccountCardProps) {
	const isMultisig = account.walletType === "multisig";

	const { data: config } = useQuery({
		queryKey: CACHE_KEYS.multisigConfig(account.id),
		queryFn: () => getMultisigConfig(account.id),
		enabled: isMultisig,
	});

	const { data: pendingTxs } = useQuery({
		queryKey: CACHE_KEYS.pendingTransactions(account.id),
		queryFn: () => getPendingTransactions(account.id),
		enabled: isMultisig,
	});

	return (
		<div
			data-testid="account-card"
			className="relative rounded-lg border border-white/[0.06] bg-[lch(7.67_0.75_272)] p-4 transition-colors hover:bg-white/[0.04]"
		>
			<div className="mb-3 flex items-start justify-between">
				<Link href={`/accounts/${account.id}`} className="flex items-center gap-2">
					<div className="bg-accent flex h-8 w-8 items-center justify-center rounded-full">
						<WalletIcon className="text-muted-foreground h-4 w-4" />
					</div>
					<div>
						<p className="text-foreground text-sm font-medium">{account.name}</p>
						<p className="text-muted-foreground text-xs">{account.tokenSymbol}</p>
					</div>
				</Link>
				<div className="flex items-center gap-2">
					{isMultisig && config && (
						<MultisigBadge ownerCount={config.owners.length} pendingCount={pendingTxs?.length} />
					)}
					<AccountMenu
						account={account}
						onRename={() => onRename(account)}
						onDelete={() => onDelete(account)}
					/>
				</div>
			</div>
			<Link href={`/accounts/${account.id}`}>
				<p className="text-xl font-semibold">{account.balanceFormatted}</p>
				<p className="text-muted-foreground mt-1 text-xs">
					{truncateAddress(account.walletAddress)}
				</p>
			</Link>
		</div>
	);
}
