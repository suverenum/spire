"use client";

import { Bot, Eye, ShieldOff, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getVendorByAddress } from "@/lib/vendors";
import { useGuardianState } from "../hooks/use-guardian-state";
import type { AgentWalletData } from "../queries/get-agents";
import { RevealKeyDialog } from "./reveal-key-dialog";

interface AgentWalletCardProps {
	wallet: AgentWalletData;
	onRevoke: (walletId: string) => void;
}

function formatAmount(raw: string, decimals = 6): string {
	const n = Number(raw) / 10 ** decimals;
	return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function truncateAddress(addr: string): string {
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatBigint(val: bigint, decimals = 6): string {
	const n = Number(val) / 10 ** decimals;
	return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AgentWalletCard({ wallet, onRevoke }: AgentWalletCardProps) {
	const [showReveal, setShowReveal] = useState(false);
	const { data: onChainState } = useGuardianState(
		wallet.guardianAddress as `0x${string}`,
		wallet.tokenAddress as `0x${string}`,
	);

	const isActive = wallet.status === "active";
	const vendorNames = wallet.allowedVendors
		.map((addr) => getVendorByAddress(addr)?.name ?? truncateAddress(addr))
		.slice(0, 3);

	return (
		<>
			<Card data-testid="agent-wallet-card">
				<div className="flex items-start justify-between p-4">
					<Link
						href={`/agents/${wallet.accountId}`}
						className="flex items-center gap-3 hover:opacity-80 transition-opacity"
					>
						<div
							className={`flex h-10 w-10 items-center justify-center rounded-lg ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}
						>
							<Bot className="h-5 w-5" />
						</div>
						<div>
							<h3 className="font-medium text-gray-900">{wallet.label}</h3>
							<p className="text-xs text-gray-500">{truncateAddress(wallet.guardianAddress)}</p>
						</div>
					</Link>
					<span
						className={`rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
						data-testid="agent-status-badge"
					>
						{wallet.status}
					</span>
				</div>

				{/* Spending limits */}
				<div className="border-t border-gray-100 px-4 py-3">
					<div className="grid grid-cols-3 gap-2 text-center text-xs">
						<div>
							<p className="text-gray-500">Per-tx cap</p>
							<p className="font-medium">${formatAmount(wallet.maxPerTx)}</p>
						</div>
						<div>
							<p className="text-gray-500">Daily limit</p>
							<p className="font-medium">${formatAmount(wallet.dailyLimit)}</p>
						</div>
						<div>
							<p className="text-gray-500">Total cap</p>
							<p className="font-medium">${formatAmount(wallet.spendingCap)}</p>
						</div>
					</div>
				</div>

				{/* Spending progress + balance */}
				{onChainState && (
					<div className="border-t border-gray-100 px-4 py-2" data-testid="spending-progress">
						<div className="mb-1 flex items-center justify-between text-xs">
							<span className="text-gray-500">Daily spending</span>
							<span className="font-medium">
								${formatBigint(onChainState.spentToday)} / ${formatBigint(onChainState.dailyLimit)}
							</span>
						</div>
						<div className="h-2 w-full rounded-full bg-gray-100">
							<div
								className="h-2 rounded-full bg-blue-500 transition-all"
								style={{
									width: `${Math.min(100, onChainState.dailyLimit > 0n ? Number((onChainState.spentToday * 100n) / onChainState.dailyLimit) : 0)}%`,
								}}
							/>
						</div>
						<div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
							<Wallet className="h-3 w-3" />
							Balance: ${formatBigint(onChainState.balance)}
						</div>
					</div>
				)}

				{/* Vendor tags */}
				<div className="border-t border-gray-100 px-4 py-2">
					<div className="flex flex-wrap gap-1">
						{vendorNames.map((name) => (
							<span key={name} className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
								{name}
							</span>
						))}
						{wallet.allowedVendors.length > 3 && (
							<span className="text-xs text-gray-400">+{wallet.allowedVendors.length - 3}</span>
						)}
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-2 border-t border-gray-100 p-3">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowReveal(true)}
						disabled={!isActive}
						data-testid="reveal-key-btn"
					>
						<Eye className="mr-1 h-3 w-3" />
						Reveal Key
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onRevoke(wallet.id)}
						disabled={!isActive}
						data-testid="revoke-btn"
					>
						<ShieldOff className="mr-1 h-3 w-3" />
						Revoke
					</Button>
				</div>
			</Card>

			{showReveal && <RevealKeyDialog walletId={wallet.id} onClose={() => setShowReveal(false)} />}
		</>
	);
}
