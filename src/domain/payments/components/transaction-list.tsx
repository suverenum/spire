"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Search } from "lucide-react";
import { cn, truncateAddress, formatBalance, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTransactions } from "../hooks/use-transactions";
import { TransactionSkeleton } from "@/components/skeletons";
import type { Payment } from "@/lib/tempo/types";

interface TransactionListProps {
  address: `0x${string}`;
}

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <p className="text-lg font-medium text-gray-500">No transactions yet</p>
      <p className="mt-1 text-sm text-gray-400">
        Send or receive a payment to get started.
      </p>
      <div className="mt-4 flex justify-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-900 underline underline-offset-4"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

function TxRow({ tx, address }: { tx: Payment; address: string }) {
  const isSent = tx.from.toLowerCase() === address.toLowerCase();
  const counterparty = isSent ? tx.to : tx.from;

  return (
    <Link
      href={`/transactions/${encodeURIComponent(tx.id)}`}
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

export function TransactionList({ address }: TransactionListProps) {
  const { data: transactions, isLoading } = useTransactions(address);
  const [search, setSearch] = useState("");

  if (isLoading && !transactions) {
    return <TransactionSkeleton />;
  }

  const all = transactions ?? [];

  const filtered = all.filter((tx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      tx.from.toLowerCase().includes(q) ||
      tx.to.toLowerCase().includes(q) ||
      tx.memo?.toLowerCase().includes(q)
    );
  });

  const sent = filtered.filter(
    (tx) => tx.from.toLowerCase() === address.toLowerCase(),
  );
  const received = filtered.filter(
    (tx) => tx.to.toLowerCase() === address.toLowerCase(),
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
          <TabsTrigger value="received">
            Received ({received.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {filtered.map((tx) => (
                <TxRow key={tx.id} tx={tx} address={address} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          {sent.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {sent.map((tx) => (
                <TxRow key={tx.id} tx={tx} address={address} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received" className="mt-4">
          {received.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {received.map((tx) => (
                <TxRow key={tx.id} tx={tx} address={address} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
