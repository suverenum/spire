"use client";

import { Bot, Check, Copy } from "lucide-react";
import { useState } from "react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { ACCOUNT_TOKENS } from "@/lib/constants";
import { type AgentCreationStep, useDeployGuardian } from "../hooks/use-deploy-guardian";

interface CreateAgentWalletDialogProps {
	open: boolean;
	onClose: () => void;
	treasuryId: string;
}

const STEP_LABELS: Record<AgentCreationStep, string> = {
	idle: "",
	validating: "Validating...",
	preflight: "Checking balances...",
	deploying: "Deploying Guardian contract...",
	funding: "Funding Guardian...",
	persisting: "Saving to database...",
	complete: "Complete!",
	error: "Error",
};

export function CreateAgentWalletDialog({
	open,
	onClose,
	treasuryId,
}: CreateAgentWalletDialogProps) {
	const [label, setLabel] = useState("");
	const [tokenSymbol, setTokenSymbol] = useState<string>(ACCOUNT_TOKENS[0]?.name ?? "pathUSD");
	const [spendingCap, setSpendingCap] = useState("50");
	const [dailyLimit, setDailyLimit] = useState("10");
	const [maxPerTx, setMaxPerTx] = useState("2");
	const [fundingAmount, setFundingAmount] = useState("10");
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [guardianAddr, setGuardianAddr] = useState<string | null>(null);

	const { mutate, step, isPending } = useDeployGuardian();

	const toBaseUnits = (usd: string) => String(Math.round(Number(usd) * 1_000_000));

	const handleSubmit = () => {
		if (!label.trim()) {
			toast("Enter a label", "error");
			return;
		}
		// Generate agent key for the factory (agent address needed for deployment)
		const agentKey = generatePrivateKey();
		const agentAccount = privateKeyToAccount(agentKey);

		mutate(
			{
				treasuryId,
				label: label.trim(),
				tokenSymbol,
				spendingCap: toBaseUnits(spendingCap),
				dailyLimit: toBaseUnits(dailyLimit),
				maxPerTx: toBaseUnits(maxPerTx),
				allowedVendors: [],
				agentAddress: agentAccount.address,
				agentPrivateKey: agentKey,
				fundingAmount: BigInt(toBaseUnits(fundingAmount)),
			},
			{
				onSuccess: (data) => {
					setCreatedKey(data.rawPrivateKey);
					setGuardianAddr(data.guardianAddress);
				},
			},
		);
	};

	const handleCopyKey = async () => {
		if (createdKey) {
			await navigator.clipboard.writeText(createdKey);
			toast("Key copied!", "success");
		}
	};

	// Success screen — show key
	if (createdKey) {
		return (
			<Sheet open={open} onClose={onClose} title="Agent Wallet Created!">
				<div className="space-y-4" data-testid="agent-key-success">
					<div className="flex items-center gap-2 text-emerald-400">
						<Check className="h-5 w-5" />
						<span className="font-medium">Guardian deployed successfully</span>
					</div>

					{guardianAddr && (
						<div>
							<p className="text-muted-foreground text-xs">Guardian address</p>
							<p className="font-mono text-sm">{guardianAddr}</p>
						</div>
					)}

					<div className="border-border bg-muted rounded-lg border p-4">
						<p className="mb-2 text-sm font-semibold text-amber-400">
							Save this key now — you won&apos;t see it in full again
						</p>
						<div className="bg-muted mb-2 rounded p-3 font-mono text-xs break-all">
							{createdKey}
						</div>
						<Button onClick={handleCopyKey} variant="outline" size="sm">
							<Copy className="mr-1 h-3 w-3" /> Copy Key
						</Button>
					</div>

					<Button onClick={onClose} className="w-full">
						Done
					</Button>
				</div>
			</Sheet>
		);
	}

	return (
		<Sheet open={open} onClose={onClose} title="Create agent wallet">
			<div className="space-y-4" data-testid="create-agent-form">
				<div>
					<label htmlFor="agent-label" className="mb-1 block text-sm font-medium">
						Label
					</label>
					<Input
						id="agent-label"
						placeholder="Marketing Bot"
						value={label}
						onChange={(e) => setLabel(e.target.value)}
						disabled={isPending}
					/>
				</div>

				<div>
					<label htmlFor="agent-token" className="mb-1 block text-sm font-medium">
						Token
					</label>
					<select
						id="agent-token"
						className="border-border bg-background text-foreground w-full rounded border px-3 py-2 text-sm"
						value={tokenSymbol}
						onChange={(e) => setTokenSymbol(e.target.value)}
						disabled={isPending}
					>
						{ACCOUNT_TOKENS.map((t) => (
							<option key={t.name} value={t.name}>
								{t.name}
							</option>
						))}
					</select>
				</div>

				<div className="grid grid-cols-3 gap-2">
					<div>
						<label htmlFor="spending-cap" className="mb-1 block text-xs font-medium">
							Spending cap ($)
						</label>
						<Input
							id="spending-cap"
							type="number"
							value={spendingCap}
							onChange={(e) => setSpendingCap(e.target.value)}
							disabled={isPending}
						/>
					</div>
					<div>
						<label htmlFor="daily-limit" className="mb-1 block text-xs font-medium">
							Daily limit ($)
						</label>
						<Input
							id="daily-limit"
							type="number"
							value={dailyLimit}
							onChange={(e) => setDailyLimit(e.target.value)}
							disabled={isPending}
						/>
					</div>
					<div>
						<label htmlFor="per-tx" className="mb-1 block text-xs font-medium">
							Per-tx cap ($)
						</label>
						<Input
							id="per-tx"
							type="number"
							value={maxPerTx}
							onChange={(e) => setMaxPerTx(e.target.value)}
							disabled={isPending}
						/>
					</div>
				</div>

				<div>
					<label htmlFor="funding" className="mb-1 block text-sm font-medium">
						Initial funding ($)
					</label>
					<Input
						id="funding"
						type="number"
						value={fundingAmount}
						onChange={(e) => setFundingAmount(e.target.value)}
						disabled={isPending}
					/>
				</div>

				{step !== "idle" && step !== "complete" && step !== "error" && (
					<div className="flex items-center gap-2 text-sm text-blue-400">
						<Bot className="h-4 w-4 animate-pulse" />
						{STEP_LABELS[step]}
					</div>
				)}

				<Button
					onClick={handleSubmit}
					disabled={isPending}
					className="w-full"
					data-testid="create-agent-submit"
				>
					{isPending ? "Creating..." : "Create agent wallet"}
				</Button>
			</div>
		</Sheet>
	);
}
