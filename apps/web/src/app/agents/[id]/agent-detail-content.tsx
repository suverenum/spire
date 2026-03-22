"use client";

import { ArrowLeft, Bot, ClipboardList, Eye, ShieldOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Address } from "viem";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { revokeAgentKey } from "@/domain/agents/actions/revoke-agent-key";
import { updateAgentLimits } from "@/domain/agents/actions/update-agent-limits";
import { RevealKeyDialog } from "@/domain/agents/components/reveal-key-dialog";
import {
	useAddToken,
	useApprovePay,
	useEmergencyWithdraw,
	useRejectPay,
	useTopUpAgent,
	useUpdateGuardianLimits,
} from "@/domain/agents/hooks/use-agent-actions";
import { useAgentWallets } from "@/domain/agents/hooks/use-agent-wallets";
import { useGuardianState } from "@/domain/agents/hooks/use-guardian-state";
import { SessionGuard } from "@/domain/auth/components/session-guard";
import { SUPPORTED_TOKENS } from "@/lib/constants";
import { getVendorByAddress } from "@/lib/vendors";
import { FundManagementCard } from "./fund-management-card";
import { SpendingLimitsCard } from "./spending-limits-card";

interface AgentDetailContentProps {
	walletId: string;
	treasuryName: string;
	authenticatedAt: number;
	treasuryId: string;
}

function truncateAddress(addr: string): string {
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function AgentDetailContent({
	walletId,
	treasuryName,
	authenticatedAt,
	treasuryId,
}: AgentDetailContentProps) {
	const { data: wallets = [] } = useAgentWallets(treasuryId);
	const wallet = wallets.find((w) => w.id === walletId || w.accountId === walletId);

	const [showReveal, setShowReveal] = useState(false);
	const [editingLimits, setEditingLimits] = useState(false);
	const [newMaxPerTx, setNewMaxPerTx] = useState("");
	const [newDailyLimit, setNewDailyLimit] = useState("");
	const [topUpAmount, setTopUpAmount] = useState("");
	const [showTopUp, setShowTopUp] = useState(false);
	const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

	const { data: onChainState } = useGuardianState(
		wallet?.guardianAddress as `0x${string}` | undefined,
		wallet?.tokenAddress as `0x${string}` | undefined,
	);

	const topUpMutation = useTopUpAgent(treasuryId);
	const _approveMutation = useApprovePay(treasuryId);
	const _rejectMutation = useRejectPay(treasuryId);
	const addTokenMutation = useAddToken(treasuryId);
	const withdrawMutation = useEmergencyWithdraw(treasuryId);
	const updateLimitsMutation = useUpdateGuardianLimits(treasuryId);

	const isActive = wallet?.status === "active";

	const handleRevoke = async () => {
		if (!wallet) return;
		const result = await revokeAgentKey(wallet.id);
		if (result.error) toast(result.error, "error");
		else toast("Agent wallet revoked", "success");
	};

	const handleSaveLimits = async () => {
		if (!wallet) return;
		const maxPerTxRaw = BigInt(Math.round(Number(newMaxPerTx) * 1_000_000));
		const dailyLimitRaw = BigInt(Math.round(Number(newDailyLimit) * 1_000_000));

		// Update on-chain first
		updateLimitsMutation.mutate(
			{
				guardianAddress: wallet.guardianAddress as Address,
				maxPerTx: maxPerTxRaw,
				dailyLimit: dailyLimitRaw,
				spendingCap: BigInt(wallet.spendingCap),
			},
			{
				onSuccess: async () => {
					// Then sync to DB
					await updateAgentLimits({
						walletId: wallet.id,
						maxPerTx: maxPerTxRaw.toString(),
						dailyLimit: dailyLimitRaw.toString(),
					});
					setEditingLimits(false);
				},
			},
		);
	};

	const handleTopUp = () => {
		if (!wallet || !topUpAmount) return;
		const amount = BigInt(Math.round(Number(topUpAmount) * 1_000_000));
		topUpMutation.mutate(
			{
				guardianAddress: wallet.guardianAddress as Address,
				tokenSymbol: wallet.tokenSymbol,
				amount,
			},
			{
				onSuccess: () => {
					setShowTopUp(false);
					setTopUpAmount("");
				},
			},
		);
	};

	const handleWithdraw = () => {
		if (!wallet) return;
		withdrawMutation.mutate(
			{
				guardianAddress: wallet.guardianAddress as Address,
				tokenSymbol: wallet.tokenSymbol,
			},
			{ onSuccess: () => setShowWithdrawConfirm(false) },
		);
	};

	return (
		<SessionGuard authenticatedAt={authenticatedAt}>
			<SidebarLayout treasuryName={treasuryName}>
				<div className="space-y-6">
					<Link
						href="/agents"
						className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
					>
						<ArrowLeft className="h-4 w-4" /> Back to Agent wallets
					</Link>

					{!wallet ? (
						<p className="text-muted-foreground">Agent wallet not found.</p>
					) : (
						<>
							{/* Header */}
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div
										className={`flex h-12 w-12 items-center justify-center rounded-lg ${isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}
									>
										<Bot className="h-6 w-6" />
									</div>
									<div>
										<h1 className="text-2xl font-semibold">{wallet.label}</h1>
										<p className="text-muted-foreground text-sm">{wallet.guardianAddress}</p>
									</div>
								</div>
								<span
									className={`rounded-full px-3 py-1 text-sm font-medium ${isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
								>
									{wallet.status}
								</span>
							</div>

							<SpendingLimitsCard
								maxPerTx={wallet.maxPerTx}
								dailyLimit={wallet.dailyLimit}
								spendingCap={wallet.spendingCap}
								isActive={isActive}
								editingLimits={editingLimits}
								newMaxPerTx={newMaxPerTx}
								newDailyLimit={newDailyLimit}
								onSetNewMaxPerTx={setNewMaxPerTx}
								onSetNewDailyLimit={setNewDailyLimit}
								onStartEditing={() => {
									setNewMaxPerTx(String(Number(wallet.maxPerTx) / 1_000_000));
									setNewDailyLimit(String(Number(wallet.dailyLimit) / 1_000_000));
									setEditingLimits(true);
								}}
								onSave={handleSaveLimits}
								onCancel={() => setEditingLimits(false)}
								isSaving={updateLimitsMutation.isPending}
							/>

							{/* Agent info */}
							<Card>
								<div className="p-4">
									<h2 className="mb-3 font-semibold">Agent Details</h2>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-muted-foreground">Agent address</span>
											<span className="font-mono">{truncateAddress(wallet.agentKeyAddress)}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Token</span>
											<span>{wallet.tokenSymbol}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Deployed</span>
											<span>{new Date(wallet.deployedAt).toLocaleDateString()}</span>
										</div>
									</div>
								</div>
							</Card>

							{/* Allowed Tokens */}
							{isActive && (
								<Card>
									<div className="flex items-center justify-between p-4">
										<h2 className="flex items-center gap-2 font-semibold">Allowed Tokens</h2>
									</div>
									<div className="border-border border-t p-4">
										<div className="flex flex-wrap gap-2">
											{Object.values(SUPPORTED_TOKENS).map((token) => (
												<Button
													key={token.address}
													size="sm"
													variant="outline"
													onClick={() =>
														addTokenMutation.mutate({
															guardianAddress: wallet!.guardianAddress as `0x${string}`,
															tokenAddress: token.address as `0x${string}`,
														})
													}
													disabled={addTokenMutation.isPending}
												>
													{addTokenMutation.isPending ? "..." : `+ ${token.name}`}
												</Button>
											))}
										</div>
										<p className="text-muted-foreground mt-2 text-xs">
											Click a token to add it to the Guardian&apos;s on-chain allowlist.
										</p>
									</div>
								</Card>
							)}

							{isActive && (
								<FundManagementCard
									showTopUp={showTopUp}
									topUpAmount={topUpAmount}
									onSetTopUpAmount={setTopUpAmount}
									onShowTopUp={() => setShowTopUp(true)}
									onHideTopUp={() => setShowTopUp(false)}
									onTopUp={handleTopUp}
									isTopUpPending={topUpMutation.isPending}
									showWithdrawConfirm={showWithdrawConfirm}
									onShowWithdraw={() => setShowWithdrawConfirm(true)}
									onHideWithdraw={() => setShowWithdrawConfirm(false)}
									onWithdraw={handleWithdraw}
									isWithdrawPending={withdrawMutation.isPending}
								/>
							)}

							{/* Pending Approvals */}
							{onChainState && onChainState.proposals.length > 0 && (
								<Card>
									<div className="p-4">
										<h2 className="flex items-center gap-2 font-semibold">
											<ClipboardList className="h-4 w-4" /> Over-limit Transactions
											<span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
												{onChainState.proposals.filter((p) => p.status === 0).length} rejected
											</span>
										</h2>
										<p className="text-muted-foreground mt-1 text-xs">
											Transactions exceeding spending limits are automatically rejected. Approvals
											coming soon.
										</p>
									</div>
									<div className="border-border border-t">
										{onChainState.proposals.map((proposal) => (
											<div
												key={proposal.id}
												className="border-border flex items-center justify-between border-b px-4 py-3 last:border-b-0"
											>
												<div className="flex items-center gap-3">
													<span className="text-muted-foreground font-mono text-xs">
														#{proposal.id}
													</span>
													<div>
														<p className="text-sm font-medium">
															${(Number(proposal.amount) / 1_000_000).toFixed(2)}{" "}
															{wallet?.tokenSymbol ?? ""}
														</p>
														<p className="text-muted-foreground text-xs">
															To:{" "}
															{getVendorByAddress(proposal.to)?.name ??
																`${proposal.to.slice(0, 8)}...${proposal.to.slice(-4)}`}
														</p>
													</div>
												</div>
												<span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
													rejected
												</span>
											</div>
										))}
									</div>
								</Card>
							)}

							{/* Actions */}
							<div className="flex gap-3">
								<Button variant="outline" onClick={() => setShowReveal(true)} disabled={!isActive}>
									<Eye className="mr-1 h-4 w-4" /> Reveal Key
								</Button>
								<Button
									variant="outline"
									onClick={handleRevoke}
									disabled={!isActive}
									className="text-red-400 hover:bg-red-500/10"
								>
									<ShieldOff className="mr-1 h-4 w-4" /> Revoke
								</Button>
							</div>
						</>
					)}
				</div>

				{showReveal && wallet && (
					<RevealKeyDialog walletId={wallet.id} onClose={() => setShowReveal(false)} />
				)}
			</SidebarLayout>
		</SessionGuard>
	);
}
