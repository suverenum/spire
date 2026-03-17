"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTransactions } from "@/domain/payments/hooks/use-transactions";
import { TransactionDetail } from "@/domain/payments/components/transaction-detail";

interface TransactionDetailContentProps {
  transactionId: string;
  tempoAddress: `0x${string}`;
  treasuryName: string;
}

export function TransactionDetailContent({
  transactionId,
  tempoAddress,
  treasuryName,
}: TransactionDetailContentProps) {
  const { data: transactions } = useTransactions(tempoAddress);
  const tx = transactions?.find((t) => t.id === transactionId);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-xl font-semibold">{treasuryName}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <h2 className="mb-4 text-2xl font-semibold">Transaction Detail</h2>
        {tx ? (
          <TransactionDetail transaction={tx} userAddress={tempoAddress} />
        ) : (
          <p className="text-gray-500">Transaction not found.</p>
        )}
      </main>
    </div>
  );
}
