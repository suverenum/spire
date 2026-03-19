"use client";

import { Bot } from "lucide-react";
import { useState } from "react";
import type { Address, Hex } from "viem";
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { ACCOUNT_TOKENS } from "@/lib/constants";
import { useCreateMultisig } from "../hooks/use-create-multisig";

interface CreateMultisigFormProps {
	open: boolean;
	onClose: () => void;
	treasuryId: string;
	adminAddress: string;
}

export function CreateMultisigForm({
	open,
	onClose,
	treasuryId,
	adminAddress,
}: CreateMultisigFormProps) {
	const [name, setName] = useState("");
	const [error, setError] = useState("");

	const { step, ...createMutation } = useCreateMultisig();

	const stepLabels: Record<string, string> = {
		validating: "Validating...",
		"deploying-wallet": "Step 1/3: Deploying wallet...",
		"deploying-guard": "Step 2/3: Deploying guard...",
		"setting-guard": "Step 3/3: Setting guard...",
		finalizing: "Saving...",
	};

	function handleSubmit() {
		setError("");

		if (!name.trim()) {
			setError("Account name is required");
			return;
		}

		if (name.length > 100) {
			setError("Account name must be 100 characters or less");
			return;
		}

		// Auto-generate agent keypair
		const agentPrivateKey = generatePrivateKey();
		const agentAddress = privateKeyToAddress(agentPrivateKey);

		const owners = [adminAddress, agentAddress];

		// Default policy: 1/2 for small amounts, 2/2 for large
		const defaultTiers = [{ maxValue: BigInt(10_000 * 1e6).toString(), requiredConfirmations: 1 }];

		createMutation.mutate(
			{
				treasuryId,
				name: name.trim(),
				tokenSymbol: ACCOUNT_TOKENS[0].name,
				owners,
				tiers: defaultTiers,
				defaultConfirmations: 2,
				allowlistEnabled: false,
				initialAllowlist: [],
				agentPrivateKey: agentPrivateKey as Hex,
				agentAddress: agentAddress as Address,
			},
			{
				onSuccess: () => {
					setName("");
					onClose();
				},
				onError: (err) => {
					setError(err.message);
				},
			},
		);
	}

	return (
		<Sheet open={open} onClose={onClose} title="Create Agent Account">
			<div className="space-y-4">
				<div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
					<p>
						An agent account is controlled by you and an automated agent. Transfers up to 10,000
						AlphaUSD require 1 approval. Larger transfers require both you and the agent.
					</p>
				</div>

				<div>
					<label htmlFor="agent-name" className="mb-1 block text-sm font-medium">
						Account Name
					</label>
					<Input
						id="agent-name"
						placeholder="e.g., Operations"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>

				<p className="text-sm text-muted-foreground">Token: {ACCOUNT_TOKENS[0].name}</p>

				<div className="text-sm text-muted-foreground">
					<p>Signers:</p>
					<div className="mt-1 space-y-1">
						<div className="rounded-md bg-background px-3 py-2 font-mono text-xs">
							{adminAddress.slice(0, 6)}...{adminAddress.slice(-4)} (you)
						</div>
						<div className="rounded-md bg-background px-3 py-2 font-mono text-xs">
							Auto-generated agent key
						</div>
					</div>
				</div>

				{error && <p className="text-sm text-red-600">{error}</p>}

				<Button
					onClick={handleSubmit}
					disabled={createMutation.isPending}
					className="w-full"
					size="lg"
				>
					<Bot className="h-4 w-4" />
					{createMutation.isPending ? (stepLabels[step] ?? "Creating...") : "Create Agent Account"}
				</Button>
			</div>
		</Sheet>
	);
}
