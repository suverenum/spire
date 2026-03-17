"use client";

import { Card } from "@/components/ui/card";
import { formatBalance } from "@/lib/utils";
import { useBalances } from "../hooks/use-balances";
import { BalanceSkeleton } from "@/components/skeletons";

interface BalanceCardsProps {
  address: `0x${string}`;
}

export function BalanceCards({ address }: BalanceCardsProps) {
  const { data: balances, isLoading } = useBalances(address);

  if (isLoading && !balances) {
    return <BalanceSkeleton />;
  }

  const items = balances ?? [];
  const totalUsd = items.reduce((sum, b) => {
    const val = Number(b.balance) / 10 ** b.decimals;
    return sum + val;
  }, 0);

  return (
    <div>
      <Card className="mb-4">
        <p className="text-sm text-gray-500">Total Balance</p>
        <p className="text-3xl font-semibold">${totalUsd.toFixed(2)}</p>
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((b) => (
          <Card key={b.token}>
            <p className="text-sm text-gray-500">{b.token}</p>
            <p className="text-xl font-semibold">
              ${formatBalance(b.balance, b.decimals)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
