"use client";

import { useEffect, useState } from "react";
import { BalanceSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";
import { formatBalance } from "@/lib/utils";
import { useBalances } from "../hooks/use-balances";

interface BalanceCardsProps {
	address: `0x${string}`;
}

export function BalanceCards({ address }: BalanceCardsProps) {
	const { data, isLoading, isError } = useBalances(address);
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	if (!mounted || (isLoading && !data)) {
		return <BalanceSkeleton />;
	}

	if (isError && !data) {
		return (
			<Card className="mb-4">
				<p className="text-sm text-red-600">Unable to load balances. Please try again later.</p>
			</Card>
		);
	}

	const items = data?.balances ?? [];
	const partial = data?.partial ?? false;
	const totalBalance = items.reduce((sum, b) => sum + b.balance, 0n);

	return (
		<div>
			{partial && (
				<Card className="mb-4">
					<p className="text-sm text-yellow-700">
						Some token balances could not be loaded. Totals may be incomplete.
					</p>
				</Card>
			)}
			<Card className="mb-4">
				<p className="text-sm text-muted-foreground">Total Balance</p>
				<p className="text-3xl font-semibold">${formatBalance(totalBalance, 6)}</p>
			</Card>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{items.map((b) => (
					<Card key={b.token}>
						<p className="text-sm text-muted-foreground">{b.token}</p>
						<p className="text-xl font-semibold">${formatBalance(b.balance, b.decimals)}</p>
					</Card>
				))}
			</div>
		</div>
	);
}
