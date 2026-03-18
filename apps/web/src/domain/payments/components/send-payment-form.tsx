"use client";

import { Send, Shield } from "lucide-react";
import { useState } from "react";
import { parseUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { SUPPORTED_TOKENS, type TokenName } from "@/lib/constants";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { formatBalance } from "@/lib/utils";
import { sendPaymentSchema } from "@/lib/validations";
import { useBalances } from "../hooks/use-balances";
import { useSendPayment } from "../hooks/use-send-payment";

interface SendPaymentFormProps {
	open: boolean;
	onClose: () => void;
	fromAddress: `0x${string}`;
	accounts?: AccountWithBalance[];
	selectedAccountId?: string;
	onAccountChange?: (accountId: string) => void;
}

export function SendPaymentForm({
	open,
	onClose,
	fromAddress,
	accounts,
	selectedAccountId,
	onAccountChange,
}: SendPaymentFormProps) {
	const [to, setTo] = useState("");
	const [amount, setAmount] = useState("");
	const [token, setToken] = useState<TokenName>("AlphaUSD");
	const [memo, setMemo] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});

	const selectedAccount = accounts?.find((a) => a.id === selectedAccountId);
	const isMultisig = selectedAccount?.walletType === "multisig";

	// When account is selected, auto-set token to account's token
	const effectiveToken = selectedAccount
		? (selectedAccount.tokenSymbol as TokenName)
		: token;

	const sendMutation = useSendPayment(fromAddress);
	const { data: balancesData } = useBalances(fromAddress);

	function validate(): boolean {
		const result = sendPaymentSchema.safeParse({
			to,
			amount,
			token: effectiveToken,
			memo: memo || undefined,
		});

		const newErrors: Record<string, string> = {};

		if (!result.success) {
			for (const issue of result.error.issues) {
				const field = String(issue.path[0] ?? "");
				if (field && !newErrors[field]) {
					newErrors[field] = issue.message;
				}
			}
		}

		if (!newErrors.amount && amount) {
			if (selectedAccount) {
				// Check against account balance directly
				try {
					const parsedAmount = parseUnits(amount, 6);
					if (parsedAmount > selectedAccount.balance) {
						newErrors.amount = "Amount exceeds available balance";
					}
				} catch {
					// handled by schema
				}
			} else {
				const tokenConfig = SUPPORTED_TOKENS[effectiveToken];
				if (tokenConfig && balancesData) {
					const tokenBalance = balancesData.balances.find(
						(b) =>
							b.tokenAddress.toLowerCase() ===
							tokenConfig.address.toLowerCase(),
					);
					if (tokenBalance) {
						try {
							const parsedAmount = parseUnits(amount, tokenConfig.decimals);
							if (parsedAmount > tokenBalance.balance) {
								newErrors.amount = "Amount exceeds available balance";
							}
						} catch {
							// handled by schema
						}
					}
				}
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	}

	function handleSubmit() {
		if (!validate()) return;

		sendMutation.mutate(
			{
				to: to as `0x${string}`,
				amount,
				token: effectiveToken,
				memo: memo || undefined,
				fromAddress,
			},
			{
				onSuccess: () => {
					setTo("");
					setAmount("");
					setMemo("");
					onClose();
				},
			},
		);
	}

	return (
		<Sheet open={open} onClose={onClose} title="Send Payment">
			<div className="space-y-4">
				{accounts && accounts.length > 0 && (
					<div>
						<label
							htmlFor="send-account"
							className="mb-1 block text-sm font-medium"
						>
							From Account
						</label>
						<select
							id="send-account"
							value={selectedAccountId ?? ""}
							onChange={(e) => onAccountChange?.(e.target.value)}
							className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
						>
							{accounts.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name} ({a.tokenSymbol}) - ${formatBalance(a.balance, 6)}
								</option>
							))}
						</select>
					</div>
				)}

				<div>
					<label htmlFor="send-to" className="mb-1 block text-sm font-medium">
						Recipient Address
					</label>
					<Input
						id="send-to"
						placeholder="0x..."
						value={to}
						onChange={(e) => setTo(e.target.value)}
					/>
					{errors.to && (
						<p className="mt-1 text-xs text-red-600">{errors.to}</p>
					)}
				</div>

				<div>
					<label
						htmlFor="send-amount"
						className="mb-1 block text-sm font-medium"
					>
						Amount
					</label>
					<Input
						id="send-amount"
						type="text"
						inputMode="decimal"
						placeholder="0.00"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
					{errors.amount && (
						<p className="mt-1 text-xs text-red-600">{errors.amount}</p>
					)}
				</div>

				{!selectedAccount && (
					<div>
						<label
							htmlFor="send-token"
							className="mb-1 block text-sm font-medium"
						>
							Token
						</label>
						<select
							id="send-token"
							value={token}
							onChange={(e) => setToken(e.target.value as TokenName)}
							className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
						>
							{Object.keys(SUPPORTED_TOKENS).map((t) => (
								<option key={t} value={t}>
									{t}
								</option>
							))}
						</select>
					</div>
				)}

				{selectedAccount && (
					<div>
						<p className="text-sm text-gray-500">
							Token: {selectedAccount.tokenSymbol}
						</p>
					</div>
				)}

				<div>
					<label htmlFor="send-memo" className="mb-1 block text-sm font-medium">
						Memo (optional)
					</label>
					<Input
						id="send-memo"
						placeholder="Invoice #1042"
						value={memo}
						onChange={(e) => setMemo(e.target.value)}
					/>
					{errors.memo && (
						<p className="mt-1 text-xs text-red-600">{errors.memo}</p>
					)}
				</div>

				<Button
					onClick={handleSubmit}
					disabled={sendMutation.isPending}
					className="w-full"
					size="lg"
				>
					{isMultisig ? (
						<Shield className="h-4 w-4" />
					) : (
						<Send className="h-4 w-4" />
					)}
					{sendMutation.isPending
						? isMultisig
							? "Submitting..."
							: "Sending..."
						: isMultisig
							? "Submit for Approval"
							: "Send Payment"}
				</Button>
			</div>
		</Sheet>
	);
}
