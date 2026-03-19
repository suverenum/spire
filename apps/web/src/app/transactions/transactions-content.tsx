"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Receipt, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { parseUnits } from "viem";
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

function TransactionRow({ tx }: { tx: GroupedTransaction }) {
	const linkId =
		tx.kind === "payment"
			? tx.txHashes[0]
			: tx.kind === "internalTransfer"
				? tx.txHashes[0]
				: tx.txHashes[0];

	if (tx.kind === "payment") {
		const isSent = tx.direction === "sent";
		return (
			<Link
				href={`/transactions/${encodeURIComponent(linkId)}`}
				className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
			>
				<div
					className={cn(
						"flex h-10 w-10 items-center justify-center rounded-full",
						isSent ? "bg-red-100" : "bg-green-100",
					)}
				>
					{isSent ? (
						<ArrowUpRight className="h-5 w-5 text-red-600" />
					) : (
						<ArrowDownLeft className="h-5 w-5 text-green-600" />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">
						{isSent ? "Sent" : "Received"} {tx.token}
					</p>
					<p className="truncate text-xs text-gray-500">
						{tx.accountName} &middot; {isSent ? "To" : "From"}:{" "}
						{truncateAddress(isSent ? tx.to : tx.from)}
					</p>
				</div>
				<div className="text-right">
					<p className={cn("text-sm font-medium", isSent ? "text-red-600" : "text-green-600")}>
						{isSent ? "-" : "+"}
						{formatBalance(tx.amount, 6)} {tx.token}
					</p>
					<p className="text-xs text-gray-400">
						{tx.status === "pending" ? "Pending" : formatDate(tx.timestamp)}
					</p>
				</div>
			</Link>
		);
	}

	if (tx.kind === "internalTransfer") {
		return (
			<Link
				href={`/transactions/${encodeURIComponent(linkId)}`}
				className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
			>
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
					<ArrowLeftRight className="h-5 w-5 text-blue-600" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">Internal Transfer</p>
					<p className="truncate text-xs text-gray-500">
						{tx.fromAccountName} &rarr; {tx.toAccountName}
					</p>
				</div>
				<div className="text-right">
					<p className="text-sm font-medium text-gray-900">
						{formatBalance(tx.amount, 6)} {tx.token}
					</p>
					<p className="text-xs text-gray-400">{formatDate(tx.timestamp)}</p>
				</div>
			</Link>
		);
	}

	if (tx.kind === "fee") {
		return (
			<Link
				href={`/transactions/${encodeURIComponent(linkId)}`}
				className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
			>
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
					<Receipt className="h-5 w-5 text-gray-500" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">Network Fee</p>
					<p className="truncate text-xs text-gray-500">{tx.accountName}</p>
				</div>
				<div className="text-right">
					<p className="text-sm font-medium text-gray-500">
						-{formatBalance(tx.amount, 6)} {tx.token}
					</p>
					<p className="text-xs text-gray-400">{formatDate(tx.timestamp)}</p>
				</div>
			</Link>
		);
	}

	// Swap
	return (
		<Link
			href={`/transactions/${encodeURIComponent(linkId)}`}
			className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
		>
			<div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
				<ArrowLeftRight className="h-5 w-5 text-purple-600" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">Swap</p>
				<p className="truncate text-xs text-gray-500">
					{tx.fromAccountName} ({tx.tokenIn}) &rarr; {tx.toAccountName} ({tx.tokenOut})
				</p>
			</div>
			<div className="text-right">
				<p className="text-sm font-medium text-gray-900">
					{formatBalance(tx.amountIn, 6)} {tx.tokenIn}
				</p>
				<p className="text-xs text-gray-400">{formatDate(tx.timestamp)}</p>
			</div>
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
									? "bg-gray-900 text-white"
									: "bg-gray-100 text-gray-600 hover:bg-gray-200",
							)}
						>
							All Accounts
						</button>
						{accounts.map((a) => (
							<button
								key={a.id}
								type="button"
								onClick={() => setAccountFilter(a.id)}
								className={cn(
									"rounded-full px-3 py-1 text-xs font-medium transition-colors",
									accountFilter === a.id
										? "bg-gray-900 text-white"
										: "bg-gray-100 text-gray-600 hover:bg-gray-200",
								)}
							>
								{a.name}
							</button>
						))}
					</div>

					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						<div className="relative col-span-2">
							<Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
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
							<p className="py-8 text-center text-sm text-gray-500">Loading transactions...</p>
						)}
						{!isLoading && filtered.length === 0 && (
							<p className="py-8 text-center text-sm text-gray-500">No transactions found</p>
						)}
						<div className="space-y-2">
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
