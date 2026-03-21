"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { TransactionRow } from "./transaction-row";

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
									? "text-foreground bg-white/[0.1]"
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
										? "text-foreground bg-white/[0.1]"
										: "bg-accent text-muted-foreground hover:bg-accent",
								)}
							>
								{a.name}
							</button>
						))}
					</div>

					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						<div className="relative col-span-2">
							<Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
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
							<p className="text-muted-foreground py-8 text-center text-sm">
								Loading transactions...
							</p>
						)}
						{!isLoading && filtered.length === 0 && (
							<p className="text-muted-foreground py-8 text-center text-sm">
								No transactions found
							</p>
						)}
						<div>
							<div className="text-muted-foreground grid grid-cols-[100px_1fr_120px_100px] gap-x-8 border-b border-white/[0.06] py-2 text-xs">
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
