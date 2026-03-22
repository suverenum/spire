"use client";

import { Bot, Key, Shield, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PendingTransactions } from "@/domain/multisig/components/pending-transactions";
import type { PendingTransactionData } from "@/domain/multisig/queries/get-pending-transactions";
import { truncateAddress } from "@/lib/utils";

interface MultisigInfoSectionProps {
	multisigConfig: {
		agentAddress: string | null;
		agentPrivateKey: string | null;
		owners: string[];
		tiersJson: Array<{ maxValue: string; requiredConfirmations: number }>;
		defaultConfirmations: number;
		allowlistEnabled: boolean;
	};
	pendingTxs: PendingTransactionData[];
	walletAddress: string;
	tempoAddress: string;
	onConfirm: (txId: string) => void;
	onExecute: (txId: string) => void;
}

export function MultisigInfoSection({
	multisigConfig,
	pendingTxs,
	walletAddress,
	tempoAddress,
	onConfirm,
	onExecute,
}: MultisigInfoSectionProps) {
	return (
		<div className="mb-6 space-y-4">
			{multisigConfig.agentAddress && (
				<Card>
					<div className="mb-2 flex items-center gap-2">
						<Bot className="h-4 w-4 text-blue-600" />
						<p className="text-sm font-medium">Agent</p>
					</div>
					<div className="space-y-2">
						<div>
							<p className="text-muted-foreground text-xs">Agent Address</p>
							<p className="text-muted-foreground font-mono text-xs">
								{multisigConfig.agentAddress}
							</p>
						</div>
						{multisigConfig.agentPrivateKey && (
							<div>
								<p className="text-muted-foreground text-xs">
									<Key className="mr-1 inline h-3 w-3" />
									Agent Private Key
								</p>
								<p className="bg-background text-muted-foreground rounded-md px-2 py-1 font-mono text-xs break-all">
									{multisigConfig.agentPrivateKey}
								</p>
							</div>
						)}
					</div>
				</Card>
			)}

			<Card>
				<div className="mb-2 flex items-center gap-2">
					<Users className="text-muted-foreground h-4 w-4" />
					<p className="text-sm font-medium">Signers ({multisigConfig.owners.length})</p>
				</div>
				<div className="space-y-1">
					{multisigConfig.owners.map((owner) => (
						<p key={owner} className="text-muted-foreground font-mono text-xs">
							{truncateAddress(owner)}
							{owner.toLowerCase() === tempoAddress.toLowerCase() && " (you)"}
							{owner.toLowerCase() === multisigConfig.agentAddress?.toLowerCase() && " (agent)"}
						</p>
					))}
				</div>
			</Card>

			<Card>
				<div className="mb-2 flex items-center gap-2">
					<Shield className="h-4 w-4 text-blue-600" />
					<p className="text-sm font-medium">Approval Policy</p>
				</div>
				<div className="text-muted-foreground space-y-1 text-sm">
					{multisigConfig.tiersJson.map((tier) => (
						<p key={tier.maxValue}>
							Up to {(Number(tier.maxValue) / 1e6).toLocaleString()} AlphaUSD:{" "}
							{tier.requiredConfirmations}/{multisigConfig.owners.length} approvals
						</p>
					))}
					<p>
						Above all tiers: {multisigConfig.defaultConfirmations}/{multisigConfig.owners.length}{" "}
						approvals
					</p>
					{multisigConfig.allowlistEnabled && (
						<p className="text-amber-600">Only allowlisted addresses can receive</p>
					)}
				</div>
			</Card>

			<div>
				<h2 className="mb-2 text-lg font-semibold">Pending Approvals</h2>
				<PendingTransactions
					transactions={pendingTxs}
					walletAddress={walletAddress}
					currentUserAddress={tempoAddress}
					onConfirm={onConfirm}
					onExecute={onExecute}
				/>
			</div>
		</div>
	);
}
