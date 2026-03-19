"use client";

import {
	AlertTriangle,
	ArrowLeft,
	Bot,
	DollarSign,
	Eye,
	Minus,
	Plus,
	ShieldOff,
	Upload,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Address } from "viem";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { addVendorToWallet, removeVendorFromWallet } from "@/domain/agents/actions/manage-vendors";
import { revokeAgentKey } from "@/domain/agents/actions/revoke-agent-key";
import { updateAgentLimits } from "@/domain/agents/actions/update-agent-limits";
import { RevealKeyDialog } from "@/domain/agents/components/reveal-key-dialog";
import {
	useEmergencyWithdraw,
	useTopUpAgent,
	useUpdateGuardianLimits,
} from "@/domain/agents/hooks/use-agent-actions";
import { useAgentWallets } from "@/domain/agents/hooks/use-agent-wallets";
import { SessionGuard } from "@/domain/auth/components/session-guard";
import { getVendorByAddress, VENDOR_LIST } from "@/lib/vendors";

interface AgentDetailContentProps {
	walletId: string;
	treasuryName: string;
	authenticatedAt: number;
	treasuryId: string;
}

function formatAmount(raw: string, decimals = 6): string {
	const n = Number(raw) / 10 ** decimals;
	return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
	const [addingVendor, setAddingVendor] = useState(false);

	const topUpMutation = useTopUpAgent(treasuryId);
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

	const handleAddVendor = async (vendorAddress: string) => {
		if (!wallet) return;
		// On-chain addRecipient would be called via wagmi hook here
		// For now, sync to DB
		const result = await addVendorToWallet({ walletId: wallet.id, vendorAddress });
		if (result.error) toast(result.error, "error");
		else toast("Vendor added", "success");
		setAddingVendor(false);
	};

	const handleRemoveVendor = async (vendorAddress: string) => {
		if (!wallet) return;
		const result = await removeVendorFromWallet({ walletId: wallet.id, vendorAddress });
		if (result.error) toast(result.error, "error");
		else toast("Vendor removed", "success");
	};

	return (
		<SessionGuard authenticatedAt={authenticatedAt}>
			<SidebarLayout treasuryName={treasuryName}>
				<div className="space-y-6">
					<Link
						href="/agents"
						className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
					>
						<ArrowLeft className="h-4 w-4" /> Back to Agent Wallets
					</Link>

					{!wallet ? (
						<p className="text-gray-500">Agent wallet not found.</p>
					) : (
						<>
							{/* Header */}
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div
										className={`flex h-12 w-12 items-center justify-center rounded-lg ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}
									>
										<Bot className="h-6 w-6" />
									</div>
									<div>
										<h1 className="text-2xl font-bold text-gray-900">{wallet.label}</h1>
										<p className="text-sm text-gray-500">{wallet.guardianAddress}</p>
									</div>
								</div>
								<span
									className={`rounded-full px-3 py-1 text-sm font-medium ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
								>
									{wallet.status}
								</span>
							</div>

							{/* Spending limits */}
							<Card>
								<div className="flex items-center justify-between p-4">
									<h2 className="flex items-center gap-2 font-semibold">
										<DollarSign className="h-4 w-4" /> Spending Limits
									</h2>
									{!editingLimits && isActive && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setNewMaxPerTx(String(Number(wallet.maxPerTx) / 1_000_000));
												setNewDailyLimit(String(Number(wallet.dailyLimit) / 1_000_000));
												setEditingLimits(true);
											}}
											data-testid="edit-limits-btn"
										>
											Edit
										</Button>
									)}
								</div>
								{editingLimits ? (
									<div className="space-y-3 border-t border-gray-100 p-4">
										<div className="grid grid-cols-2 gap-4">
											<div>
												<label
													htmlFor="edit-max-per-tx"
													className="mb-1 block text-xs font-medium text-gray-500"
												>
													Per-tx cap ($)
												</label>
												<Input
													id="edit-max-per-tx"
													type="number"
													value={newMaxPerTx}
													onChange={(e) => setNewMaxPerTx(e.target.value)}
												/>
											</div>
											<div>
												<label
													htmlFor="edit-daily-limit"
													className="mb-1 block text-xs font-medium text-gray-500"
												>
													Daily limit ($)
												</label>
												<Input
													id="edit-daily-limit"
													type="number"
													value={newDailyLimit}
													onChange={(e) => setNewDailyLimit(e.target.value)}
												/>
											</div>
										</div>
										<div className="flex gap-2">
											<Button
												size="sm"
												onClick={handleSaveLimits}
												disabled={updateLimitsMutation.isPending}
											>
												{updateLimitsMutation.isPending
													? "Updating on-chain..."
													: "Save & Update On-Chain"}
											</Button>
											<Button size="sm" variant="outline" onClick={() => setEditingLimits(false)}>
												Cancel
											</Button>
										</div>
									</div>
								) : (
									<div className="grid grid-cols-3 gap-4 border-t border-gray-100 p-4 text-center">
										<div>
											<p className="text-xs text-gray-500">Per-tx cap</p>
											<p className="text-lg font-semibold">${formatAmount(wallet.maxPerTx)}</p>
										</div>
										<div>
											<p className="text-xs text-gray-500">Daily limit</p>
											<p className="text-lg font-semibold">${formatAmount(wallet.dailyLimit)}</p>
										</div>
										<div>
											<p className="text-xs text-gray-500">Total cap</p>
											<p className="text-lg font-semibold">${formatAmount(wallet.spendingCap)}</p>
										</div>
									</div>
								)}
							</Card>

							{/* Allowed vendors */}
							<Card>
								<div className="flex items-center justify-between p-4">
									<h2 className="flex items-center gap-2 font-semibold">
										<Users className="h-4 w-4" /> Allowed Vendors
									</h2>
									{isActive && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => setAddingVendor(!addingVendor)}
											data-testid="manage-vendors-btn"
										>
											<Plus className="mr-1 h-3 w-3" /> Add
										</Button>
									)}
								</div>
								<div className="border-t border-gray-100 p-4">
									<div className="flex flex-wrap gap-2">
										{wallet.allowedVendors.map((addr) => {
											const vendor = getVendorByAddress(addr);
											return (
												<span
													key={addr}
													className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700"
												>
													{vendor?.name ?? truncateAddress(addr)}
													{isActive && (
														<button
															type="button"
															onClick={() => handleRemoveVendor(addr)}
															className="ml-1 text-blue-400 hover:text-red-500"
															title="Remove vendor"
														>
															<Minus className="h-3 w-3" />
														</button>
													)}
												</span>
											);
										})}
									</div>
									{addingVendor && (
										<div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
											<p className="mb-1 w-full text-xs text-gray-500">Add a vendor:</p>
											{VENDOR_LIST.filter(
												(v) => !wallet.allowedVendors.includes(v.address.toLowerCase()),
											).map((vendor) => (
												<button
													key={vendor.id}
													type="button"
													onClick={() => handleAddVendor(vendor.address)}
													className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
												>
													+ {vendor.name}
												</button>
											))}
										</div>
									)}
								</div>
							</Card>

							{/* Agent info */}
							<Card>
								<div className="p-4">
									<h2 className="mb-3 font-semibold">Agent Details</h2>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-gray-500">Agent address</span>
											<span className="font-mono">{truncateAddress(wallet.agentKeyAddress)}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-500">Token</span>
											<span>{wallet.tokenSymbol}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-500">Deployed</span>
											<span>{new Date(wallet.deployedAt).toLocaleDateString()}</span>
										</div>
									</div>
								</div>
							</Card>

							{/* Fund management */}
							{isActive && (
								<Card>
									<div className="p-4">
										<h2 className="mb-3 flex items-center gap-2 font-semibold">
											<Upload className="h-4 w-4" /> Fund Management
										</h2>
										<div className="flex flex-wrap gap-3">
											{showTopUp ? (
												<div className="flex items-end gap-2">
													<div>
														<label
															htmlFor="top-up-amount"
															className="mb-1 block text-xs text-gray-500"
														>
															Amount ($)
														</label>
														<Input
															id="top-up-amount"
															type="number"
															placeholder="10.00"
															value={topUpAmount}
															onChange={(e) => setTopUpAmount(e.target.value)}
															className="w-32"
														/>
													</div>
													<Button
														size="sm"
														onClick={handleTopUp}
														disabled={topUpMutation.isPending || !topUpAmount}
													>
														{topUpMutation.isPending ? "Sending..." : "Top Up"}
													</Button>
													<Button size="sm" variant="outline" onClick={() => setShowTopUp(false)}>
														Cancel
													</Button>
												</div>
											) : (
												<Button
													variant="outline"
													onClick={() => setShowTopUp(true)}
													data-testid="top-up-btn"
												>
													<Plus className="mr-1 h-4 w-4" /> Top Up
												</Button>
											)}

											{showWithdrawConfirm ? (
												<div className="flex items-center gap-2 rounded-lg border-2 border-red-200 bg-red-50 p-3">
													<AlertTriangle className="h-5 w-5 text-red-500" />
													<span className="text-sm text-red-700">Pull ALL funds back?</span>
													<Button
														size="sm"
														onClick={handleWithdraw}
														disabled={withdrawMutation.isPending}
														className="bg-red-600 hover:bg-red-700"
													>
														{withdrawMutation.isPending ? "Withdrawing..." : "Confirm"}
													</Button>
													<Button
														size="sm"
														variant="outline"
														onClick={() => setShowWithdrawConfirm(false)}
													>
														Cancel
													</Button>
												</div>
											) : (
												<Button
													variant="outline"
													onClick={() => setShowWithdrawConfirm(true)}
													className="text-red-600 hover:bg-red-50"
													data-testid="emergency-withdraw-btn"
												>
													<AlertTriangle className="mr-1 h-4 w-4" /> Emergency Withdraw
												</Button>
											)}
										</div>
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
									className="text-red-600 hover:bg-red-50"
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
