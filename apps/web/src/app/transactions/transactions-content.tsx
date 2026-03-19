"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { parseUnits } from "viem";
import { SendIcon, TransactionsIcon, TransferIcon } from "@/components/icons";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAllTransactions } from "@/domain/accounts/hooks/use-all-transactions";
import { getAccounts } from "@/domain/accounts/queries/get-accounts";
import { SessionGuard } from "@/domain/auth/components/session-guard";
import { CACHE_KEYS } from "@/lib/constants";
import type { AccountRecord, GroupedTransaction } from "@/lib/tempo/types";
import { cn, formatBalance, formatDate, truncateAddress } from "@/lib/utils";

interface TransactionsContentProps {
	treasuryName: string;
	authenticatedAt: number;
	treasuryId: string;
}

function matchesAddressFilter(tx: GroupedTransaction, address: string): boolean {
	const lower = address.toLowerCase();
	if (tx.kind === "payment") {
		return tx.from.toLowerCase().includes(lower) || tx.to.toLowerCase().includes(lower);
	}
	if (tx.kind === "internalTransfer") {
		return (
			tx.fromWalletAddress.toLowerCase().includes(lower) ||
			tx.toWalletAddress.toLowerCase().includes(lower)
		);
	}
	if (tx.kind === "fee") return false;
	return (
		tx.sourceWalletAddress.toLowerCase().includes(lower) ||
		tx.destinationWalletAddress.toLowerCase().includes(lower)
	);
}

function getComparableAmount(tx: GroupedTransaction): bigint {
	if (tx.kind === "payment") return tx.amount;
	if (tx.kind === "internalTransfer") return tx.amount;
	if (tx.kind === "fee") return tx.amount;
	return tx.amountIn;
}

const rowClass =
	"grid grid-cols-[100px_1fr_120px_100px] gap-x-8 items-center border-b border-white/[0.06] py-4 transition-colors hover:bg-white/[0.02]";

function TransactionRow({ tx }: { tx: GroupedTransaction }) {
	const linkId = tx.txHashes[0];

	if (tx.kind === "payment") {
		const isSent = tx.direction === "sent";
		return (
			<Link href={`/transactions/${encodeURIComponent(linkId)}`} className={rowClass}>
				<span className="text-sm text-muted-foreground">
					{tx.status === "pending" ? "Pending" : formatDate(tx.timestamp)}
				</span>
				<span className="flex items-center gap-3">
					<span
						className={cn(
							"flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
							isSent ? "bg-red-500/10" : "bg-green-500/10",
						)}
					>
						<SendIcon
							className={cn("h-4 w-4", isSent ? "text-red-400 rotate-180" : "text-green-400")}
						/>
					</span>
					<span className="truncate text-sm font-medium text-foreground">
						{isSent ? `To ${truncateAddress(tx.to)}` : `From ${truncateAddress(tx.from)}`}
					</span>
				</span>
				<span
					className={cn(
						"text-right text-sm font-medium",
						isSent ? "text-foreground" : "text-green-400",
					)}
				>
					{isSent ? "-" : ""}
					{formatBalance(tx.amount, 6)}
				</span>
				<span className="text-right text-sm text-muted-foreground">{tx.accountName}</span>
			</Link>
		);
	}

	if (tx.kind === "internalTransfer") {
		return (
			<Link href={`/transactions/${encodeURIComponent(linkId)}`} className={rowClass}>
				<span className="text-sm text-muted-foreground">{formatDate(tx.timestamp)}</span>
				<span className="flex items-center gap-3">
					<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
						<TransferIcon className="h-4 w-4 text-blue-400" />
					</span>
					<span className="truncate text-sm font-medium text-foreground">
						{tx.fromAccountName} &rarr; {tx.toAccountName}
					</span>
				</span>
				<span className="text-right text-sm font-medium text-foreground">
					{formatBalance(tx.amount, 6)}
				</span>
				<span className="text-right text-sm text-muted-foreground">{tx.fromAccountName}</span>
			</Link>
		);
	}

	if (tx.kind === "fee") {
		return (
			<Link href={`/transactions/${encodeURIComponent(linkId)}`} className={rowClass}>
				<span className="text-sm text-muted-foreground">{formatDate(tx.timestamp)}</span>
				<span className="flex items-center gap-3">
					<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
						<TransactionsIcon className="h-4 w-4 text-muted-foreground" />
					</span>
					<span className="truncate text-sm font-medium text-muted-foreground">Network Fee</span>
				</span>
				<span className="text-right text-sm font-medium text-muted-foreground">
					-{formatBalance(tx.amount, 6)}
				</span>
				<span className="text-right text-sm text-muted-foreground">{tx.accountName}</span>
			</Link>
		);
	}

	// Swap
	return (
		<Link href={`/transactions/${encodeURIComponent(linkId)}`} className={rowClass}>
			<span className="text-sm text-muted-foreground">{formatDate(tx.timestamp)}</span>
			<span className="flex items-center gap-3">
				<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
					<TransferIcon className="h-4 w-4 text-purple-400" />
				</span>
				<span className="truncate text-sm font-medium text-foreground">
					{tx.tokenIn} &rarr; {tx.tokenOut}
				</span>
			</span>
			<span className="text-right text-sm font-medium text-foreground">
				{formatBalance(tx.amountIn, 6)}
			</span>
			<span className="text-right text-sm text-muted-foreground">{tx.fromAccountName}</span>
		</Link>
	);
}

export function TransactionsContent({
	treasuryName,
	authenticatedAt,
	treasuryId,
}: TransactionsContentProps) {
	const searchParams = useSearchParams();
	const router = useRouter();

	const accountFilter = searchParams.get("account") || "all";
	const addressFilter = searchParams.get("address") || "";
	const dateFrom = searchParams.get("dateFrom") || "";
	const dateTo = searchParams.get("dateTo") || "";
	const minAmount = searchParams.get("minAmount") || "";
	const maxAmount = searchParams.get("maxAmount") || "";
	const tab = searchParams.get("tab") || "all";

	const setFilter = useCallback(
		(key: string, value: string) => {
			const params = new URLSearchParams(searchParams.toString());
			if (value && value !== "all") {
				params.set(key, value);
			} else {
				params.delete(key);
			}
			router.replace(`?${params.toString()}`, { scroll: false });
		},
		[searchParams, router],
	);

	const setAccountFilter = (v: string) => setFilter("account", v);
	const setAddressFilter = (v: string) => setFilter("address", v);
	const setDateFrom = (v: string) => setFilter("dateFrom", v);
	const setDateTo = (v: string) => setFilter("dateTo", v);
	const setMinAmount = (v: string) => setFilter("minAmount", v);
	const setMaxAmount = (v: string) => setFilter("maxAmount", v);
	const setTab = (v: string) => setFilter("tab", v);

	const { data: rawAccounts = [] } = useQuery({
		queryKey: CACHE_KEYS.accounts(treasuryId),
		queryFn: () => getAccounts(),
	});

	const accounts: AccountRecord[] = rawAccounts.map((a) => ({
		...a,
		createdAt: new Date(a.createdAt),
	}));

	const { transactions, isLoading } = useAllTransactions(accounts);

	const filtered = transactions
		.filter((tx) => accountFilter === "all" || tx.visibleAccountIds.includes(accountFilter))
		.filter((tx) => {
			if (tab === "all") return true;
			// Sent/Received tabs only apply to external payments
			if (tx.kind !== "payment") return false;
			return tx.direction === tab;
		})
		.filter((tx) => !addressFilter || matchesAddressFilter(tx, addressFilter))
		.filter((tx) => !dateFrom || tx.timestamp >= new Date(dateFrom))
		.filter((tx) => {
			if (!dateTo) return true;
			const endOfDay = new Date(`${dateTo}T23:59:59.999Z`);
			return tx.timestamp <= endOfDay;
		})
		.filter((tx) => {
			if (!minAmount) return true;
			try {
				return getComparableAmount(tx) >= parseUnits(minAmount, 6);
			} catch {
				return true;
			}
		})
		.filter((tx) => {
			if (!maxAmount) return true;
			try {
				return getComparableAmount(tx) <= parseUnits(maxAmount, 6);
			} catch {
				return true;
			}
		});

	return (
		<SessionGuard authenticatedAt={authenticatedAt}>
			<SidebarLayout treasuryName={treasuryName}>
				<h1 className="mb-4 text-2xl font-semibold">Transactions</h1>

				{/* Filters */}
				<div className="mb-4 space-y-3">
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => setAccountFilter("all")}
							className={cn(
								"rounded-full px-3 py-1 text-xs font-medium transition-colors",
								accountFilter === "all"
									? "bg-white/[0.1] text-foreground"
									: "bg-accent text-muted-foreground hover:bg-accent",
							)}
						>
							All
						</button>
						{accounts.map((a) => (
							<button
								key={a.id}
								type="button"
								onClick={() => setAccountFilter(a.id)}
								className={cn(
									"rounded-full px-3 py-1 text-xs font-medium transition-colors",
									accountFilter === a.id
										? "bg-white/[0.1] text-foreground"
										: "bg-accent text-muted-foreground hover:bg-accent",
								)}
							>
								{a.name}
							</button>
						))}
					</div>

					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						<div className="relative col-span-2">
							<Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Filter by address..."
								value={addressFilter}
								onChange={(e) => setAddressFilter(e.target.value)}
								className="pl-9"
							/>
						</div>
						<Input
							type="date"
							value={dateFrom}
							onChange={(e) => setDateFrom(e.target.value)}
							placeholder="From"
						/>
						<Input
							type="date"
							value={dateTo}
							onChange={(e) => setDateTo(e.target.value)}
							placeholder="To"
						/>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<Input
							type="text"
							inputMode="decimal"
							placeholder="Min amount"
							value={minAmount}
							onChange={(e) => setMinAmount(e.target.value)}
						/>
						<Input
							type="text"
							inputMode="decimal"
							placeholder="Max amount"
							value={maxAmount}
							onChange={(e) => setMaxAmount(e.target.value)}
						/>
					</div>
				</div>

				<Tabs value={tab} onValueChange={setTab}>
					<TabsList className="mb-4">
						<TabsTrigger value="all">All</TabsTrigger>
						<TabsTrigger value="sent">Sent</TabsTrigger>
						<TabsTrigger value="received">Received</TabsTrigger>
					</TabsList>

					<TabsContent value={tab}>
						{isLoading && (
							<p className="py-8 text-center text-sm text-muted-foreground">
								Loading transactions...
							</p>
						)}
						{!isLoading && filtered.length === 0 && (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No transactions found
							</p>
						)}
						<div>
							<div className="grid grid-cols-[100px_1fr_120px_100px] gap-x-8 border-b border-white/[0.06] py-2 text-xs text-muted-foreground">
								<span>Date</span>
								<span>To/From</span>
								<span className="text-right">Amount</span>
								<span className="text-right">Account</span>
							</div>
							{filtered.map((tx) => (
								<TransactionRow key={tx.groupId} tx={tx} />
							))}
						</div>
					</TabsContent>
				</Tabs>
			</SidebarLayout>
		</SessionGuard>
	);
}
