"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn, truncateAddress, formatBalance, formatDate } from "@/lib/utils";
import { useTransactions } from "../hooks/use-transactions";
import { TransactionSkeleton } from "@/components/skeletons";
import type { Payment } from "@/lib/tempo/types";

interface RecentTransactionsProps {
  address: `0x${string}`;
}

function TransactionRow({ tx, address }: { tx: Payment; address: string }) {
  const isSent = tx.from.toLowerCase() === address.toLowerCase();
  const counterparty = isSent ? tx.to : tx.from;

  return (
    <Link
      href={`/transactions/${tx.id}`}
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
          {isSent ? "To" : "From"}: {truncateAddress(counterparty)}
        </p>
        {tx.memo && <p className="truncate text-xs text-gray-400">{tx.memo}</p>}
      </div>
      <div className="text-right">
        <p
          className={cn(
            "text-sm font-medium",
            isSent ? "text-red-600" : "text-green-600",
          )}
        >
          {isSent ? "-" : "+"}${formatBalance(tx.amount, 6)}
        </p>
        <p className="text-xs text-gray-400">
          {tx.status === "pending" ? "Pending" : formatDate(tx.timestamp)}
        </p>
      </div>
    </Link>
  );
}

export function RecentTransactions({ address }: RecentTransactionsProps) {
  const { data: transactions, isLoading } = useTransactions(address);

  if (isLoading && !transactions) {
    return <TransactionSkeleton />;
  }

  const items = transactions ?? [];

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No transactions yet</p>
        <p className="mt-1 text-sm text-gray-400">
          Send or receive a payment to get started.
        </p>
      </div>
    );
  }

  const recent = items.slice(0, 5);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Transactions</h2>
        <Link
          href="/transactions"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          View all &rarr;
        </Link>
      </div>
      <div className="space-y-2">
        {recent.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} address={address} />
        ))}
      </div>
    </div>
  );
}
