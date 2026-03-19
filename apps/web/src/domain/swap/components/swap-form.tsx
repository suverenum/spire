"use client";

import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { parseUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountSelector } from "@/domain/accounts/components/account-selector";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { useExecuteSwap } from "../hooks/use-execute-swap";
import { useSwapQuote } from "../hooks/use-swap-quote";
import { SwapQuoteDisplay } from "./swap-quote";

interface SwapFormProps {
	accounts: AccountWithBalance[];
	treasuryId: string;
}

export function SwapForm({ accounts, treasuryId }: SwapFormProps) {
	const [fromAccountId, setFromAccountId] = useState<string>("");
	const [toAccountId, setToAccountId] = useState<string>("");
	const [amount, setAmount] = useState("");
	const [error, setError] = useState("");

	const fromAccount = accounts.find((a) => a.id === fromAccountId);
	const toAccount = accounts.find((a) => a.id === toAccountId);

	const parsedAmount =
		amount && fromAccount
			? (() => {
					try {
						return parseUnits(amount, 6);
					} catch {
						return undefined;
					}
				})()
			: undefined;

	const { data: quote, isLoading: quoteLoading } = useSwapQuote({
		tokenIn: fromAccount?.tokenAddress as `0x${string}` | undefined,
		tokenOut: toAccount?.tokenAddress as `0x${string}` | undefined,
		amountIn: parsedAmount,
		enabled: !!fromAccount && !!toAccount && !!parsedAmount,
	});

	const swapMutation = useExecuteSwap();

	function handleSubmit() {
		setError("");

		if (!fromAccountId || !toAccountId) {
			setError("Select both accounts");
			return;
		}

		if (fromAccount?.tokenSymbol === toAccount?.tokenSymbol) {
			setError("Swap requires different token types");
			return;
		}

		if (!parsedAmount || parsedAmount <= 0n) {
			setError("Enter a valid amount");
			return;
		}

		if (fromAccount && parsedAmount > fromAccount.balance) {
			setError("Amount exceeds available balance");
			return;
		}

		if (!quote) {
			setError("No quote available");
			return;
		}

		swapMutation.mutate({
			fromAccountId,
			toAccountId,
			amountIn: parsedAmount,
			minAmountOut: quote.minAmountOut,
			treasuryId,
		});
	}

	return (
		<div className="space-y-4">
			<AccountSelector
				accounts={accounts}
				selectedAccountId={fromAccountId}
				onSelect={(id) => {
					setFromAccountId(id);
					// Reset to if same token
					if (toAccount) {
						const newFrom = accounts.find((a) => a.id === id);
						if (newFrom?.tokenSymbol === toAccount.tokenSymbol) {
							setToAccountId("");
						}
					}
				}}
				label="From"
			/>

			<div className="flex justify-center">
				<ArrowLeftRight className="text-muted-foreground h-5 w-5" />
			</div>

			<AccountSelector
				accounts={accounts}
				selectedAccountId={toAccountId}
				onSelect={setToAccountId}
				label="To"
				excludeAccountId={fromAccountId}
				excludeToken={fromAccount?.tokenSymbol}
			/>

			<div>
				<label htmlFor="swap-amount" className="mb-1 block text-sm font-medium">
					Amount
				</label>
				<Input
					id="swap-amount"
					type="text"
					inputMode="decimal"
					placeholder="0.00"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
				/>
			</div>

			{quote && (
				<SwapQuoteDisplay
					amountOut={quote.amountOut}
					tokenOut={toAccount?.tokenSymbol ?? ""}
					rate={quote.rate}
					slippage={quote.slippage}
					minAmountOut={quote.minAmountOut}
					isLoading={quoteLoading}
				/>
			)}

			{error && <p className="text-sm text-red-600">{error}</p>}

			<Button
				onClick={handleSubmit}
				disabled={swapMutation.isPending || !quote}
				className="w-full"
				size="lg"
			>
				{swapMutation.isPending ? "Swapping..." : "Swap"}
			</Button>
		</div>
	);
}
