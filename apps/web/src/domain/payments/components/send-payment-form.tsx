"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Send, Shield } from "lucide-react";
import { useState } from "react";
import { encodeFunctionData, parseEventLogs, parseUnits } from "viem";
import { useConfig } from "wagmi";
import { getPublicClient, getWalletClient } from "wagmi/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import {
	addMultisigConfirmation,
	upsertMultisigTransaction,
} from "@/domain/multisig/actions/sync-multisig-state";
import { getMultisigConfig } from "@/domain/multisig/queries/get-multisig-config";
import { CACHE_KEYS, SUPPORTED_TOKENS, type TokenName } from "@/lib/constants";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { formatBalance } from "@/lib/utils";
import { sendPaymentSchema } from "@/lib/validations";
import { useBalances } from "../hooks/use-balances";
import { useSendPayment } from "../hooks/use-send-payment";

const Tip20Abi = [
	{
		type: "function",
		name: "transfer",
		inputs: [
			{ name: "to", type: "address" },
			{ name: "value", type: "uint256" },
		],
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "nonpayable",
	},
] as const;

const MultisigSubmitAbi = [
	{
		type: "function",
		name: "submitTransaction",
		inputs: [
			{ name: "to", type: "address" },
			{ name: "value", type: "uint256" },
			{ name: "data", type: "bytes" },
		],
		outputs: [{ name: "txId", type: "uint256" }],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		name: "TransactionSubmitted",
		inputs: [
			{ name: "txId", type: "uint256", indexed: true },
			{ name: "to", type: "address", indexed: true },
			{ name: "value", type: "uint256", indexed: false },
			{ name: "data", type: "bytes", indexed: false },
		],
	},
] as const;

interface MultisigSubmitResult {
	txId: string;
	requiredConfirmations: number;
	totalSigners: number;
}

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
	const wagmiConfig = useConfig();
	const queryClient = useQueryClient();
	const [to, setTo] = useState("");
	const [amount, setAmount] = useState("");
	const [token, setToken] = useState<TokenName>("AlphaUSD");
	const [memo, setMemo] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [multisigSubmitting, setMultisigSubmitting] = useState(false);
	const [multisigResult, setMultisigResult] = useState<MultisigSubmitResult | null>(null);

	const selectedAccount = accounts?.find((a) => a.id === selectedAccountId);
	const isMultisig = selectedAccount?.walletType === "multisig";

	const { data: multisigConfig } = useQuery({
		queryKey: CACHE_KEYS.multisigConfig(selectedAccount?.id ?? ""),
		queryFn: () => getMultisigConfig(selectedAccount!.id),
		enabled: isMultisig && !!selectedAccount,
	});

	// When account is selected, auto-set token to account's token
	const effectiveToken = selectedAccount ? (selectedAccount.tokenSymbol as TokenName) : token;

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
						(b) => b.tokenAddress.toLowerCase() === tokenConfig.address.toLowerCase(),
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

	async function handleMultisigSubmit() {
		if (!selectedAccount || !multisigConfig) return;
		setMultisigSubmitting(true);
		try {
			const publicClient = getPublicClient(wagmiConfig);
			const walletClient = await getWalletClient(wagmiConfig);
			if (!publicClient || !walletClient) {
				toast("Wallet not connected", "error");
				return;
			}

			const tokenConfig = SUPPORTED_TOKENS[effectiveToken];
			const parsedAmount = parseUnits(amount, tokenConfig.decimals);

			// Encode ERC20 transfer as calldata for the multisig
			const transferData = encodeFunctionData({
				abi: Tip20Abi,
				functionName: "transfer",
				args: [to as `0x${string}`, parsedAmount],
			});

			// Submit to multisig contract
			const hash = await walletClient.writeContract({
				account: walletClient.account!,
				chain: walletClient.chain,
				address: selectedAccount.walletAddress as `0x${string}`,
				abi: MultisigSubmitAbi,
				functionName: "submitTransaction",
				args: [tokenConfig.address, 0n, transferData],
			});

			const receipt = await publicClient.waitForTransactionReceipt({ hash });
			const logs = parseEventLogs({
				abi: MultisigSubmitAbi,
				logs: receipt.logs,
				eventName: "TransactionSubmitted",
			});

			if (logs.length === 0) throw new Error("TransactionSubmitted event not found");
			const txId = logs[0].args.txId.toString();

			// Determine required confirmations from tier config
			const amountUsd = Number(amount);
			const sortedTiers = [...multisigConfig.tiersJson].sort(
				(a, b) => Number(a.maxValue) - Number(b.maxValue),
			);
			let reqConf = multisigConfig.defaultConfirmations;
			for (const tier of sortedTiers) {
				if (amountUsd * 1e6 <= Number(tier.maxValue)) {
					reqConf = tier.requiredConfirmations;
					break;
				}
			}

			// Sync to DB
			const { id: dbTxId } = await upsertMultisigTransaction({
				accountId: selectedAccount.id,
				onChainTxId: BigInt(txId),
				to: tokenConfig.address,
				value: "0",
				data: transferData,
				requiredConfirmations: reqConf,
				currentConfirmations: 1,
				executed: false,
			});
			// Record submitter's auto-confirmation
			if (walletClient.account) {
				await addMultisigConfirmation({
					multisigTransactionId: dbTxId,
					signerAddress: walletClient.account.address,
				});
			}

			setMultisigResult({
				txId,
				requiredConfirmations: reqConf,
				totalSigners: multisigConfig.owners.length,
			});

			// Invalidate pending transactions cache
			void queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.pendingTransactions(selectedAccount.id),
			});

			toast("Transaction submitted for approval", "success");
		} catch (err) {
			toast(err instanceof Error ? err.message : "Submission failed", "error");
		} finally {
			setMultisigSubmitting(false);
		}
	}

	function handleSubmit() {
		if (!validate()) return;

		if (isMultisig && selectedAccount) {
			void handleMultisigSubmit();
			return;
		}

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
		<Sheet
			open={open}
			onClose={() => {
				setMultisigResult(null);
				onClose();
			}}
			title="Send Payment"
		>
			{multisigResult ? (
				<div className="space-y-4 text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
						<Check className="h-6 w-6 text-green-600" />
					</div>
					<h3 className="text-lg font-semibold">Transaction Proposed</h3>
					<p className="text-sm text-gray-600">
						Awaiting {multisigResult.requiredConfirmations - 1} more approval
						{multisigResult.requiredConfirmations - 1 !== 1 ? "s" : ""}
					</p>
					<div className="flex items-center justify-center gap-1">
						<div className="h-3 w-3 rounded-full bg-blue-600" />
						{multisigResult.totalSigners > 1 &&
							Array.from({ length: multisigResult.totalSigners - 1 }, () => "pending").map(
								(status, _idx) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: static visual dots never reorder
									<div key={_idx} className="h-3 w-3 rounded-full bg-gray-200" />
								),
							)}
						<span className="ml-2 text-xs text-gray-500">
							1/{multisigResult.requiredConfirmations} confirmed
						</span>
					</div>
					<Button
						variant="outline"
						onClick={() => {
							setMultisigResult(null);
							setTo("");
							setAmount("");
							setMemo("");
							onClose();
						}}
						className="w-full"
					>
						Done
					</Button>
				</div>
			) : (
				<div className="space-y-4">
					{accounts && accounts.length > 0 && (
						<div>
							<label htmlFor="send-account" className="mb-1 block text-sm font-medium">
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

					{isMultisig && multisigConfig && (
						<div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
							<div className="flex items-center gap-1 font-medium">
								<Shield className="h-3.5 w-3.5" />
								Multisig Policy
							</div>
							<p className="mt-1">
								Requires {multisigConfig.defaultConfirmations}/{multisigConfig.owners.length}{" "}
								approvals
							</p>
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
						{errors.to && <p className="mt-1 text-xs text-red-600">{errors.to}</p>}
					</div>

					<div>
						<label htmlFor="send-amount" className="mb-1 block text-sm font-medium">
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
						{errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
					</div>

					{!selectedAccount && (
						<div>
							<label htmlFor="send-token" className="mb-1 block text-sm font-medium">
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
							<p className="text-sm text-gray-500">Token: {selectedAccount.tokenSymbol}</p>
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
						{errors.memo && <p className="mt-1 text-xs text-red-600">{errors.memo}</p>}
					</div>

					<Button
						onClick={handleSubmit}
						disabled={sendMutation.isPending || multisigSubmitting}
						className="w-full"
						size="lg"
					>
						{isMultisig ? <Shield className="h-4 w-4" /> : <Send className="h-4 w-4" />}
						{sendMutation.isPending || multisigSubmitting
							? isMultisig
								? "Submitting..."
								: "Sending..."
							: isMultisig
								? "Submit for Approval"
								: "Send Payment"}
					</Button>
				</div>
			)}
		</Sheet>
	);
}
