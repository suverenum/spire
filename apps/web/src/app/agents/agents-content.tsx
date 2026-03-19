"use client";

import { Bot, Plus } from "lucide-react";
import { useState } from "react";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { revokeAgentKey } from "@/domain/agents/actions/revoke-agent-key";
import { AgentWalletCard } from "@/domain/agents/components/agent-wallet-card";
import { CreateAgentWalletDialog } from "@/domain/agents/components/create-agent-wallet-dialog";
import { useAgentWallets } from "@/domain/agents/hooks/use-agent-wallets";
import { SessionGuard } from "@/domain/auth/components/session-guard";

interface AgentsContentProps {
	treasuryName: string;
	authenticatedAt: number;
	treasuryId: string;
}

export function AgentsContent({ treasuryName, authenticatedAt, treasuryId }: AgentsContentProps) {
	const [createOpen, setCreateOpen] = useState(false);
	const { data: wallets = [], isLoading } = useAgentWallets(treasuryId);

	const handleRevoke = async (walletId: string) => {
		const result = await revokeAgentKey(walletId);
		if (result.error) {
			toast(result.error, "error");
		} else {
			toast("Agent wallet revoked", "success");
		}
	};

	return (
		<SessionGuard authenticatedAt={authenticatedAt}>
			<SidebarLayout treasuryName={treasuryName}>
				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Agent Wallets</h1>
							<p className="text-sm text-gray-500">Create guardrailed wallets for your AI agents</p>
						</div>
						<Button onClick={() => setCreateOpen(true)} data-testid="create-agent-btn">
							<Plus className="mr-1 h-4 w-4" /> Create Agent Wallet
						</Button>
					</div>

					{isLoading && (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{[1, 2, 3].map((i) => (
								<div key={i} className="h-48 animate-pulse rounded-lg bg-gray-100" />
							))}
						</div>
					)}

					{!isLoading && wallets.length === 0 && (
						<div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
							<Bot className="mb-3 h-12 w-12 text-gray-300" />
							<h3 className="text-lg font-medium text-gray-600">No agent wallets yet</h3>
							<p className="mt-1 text-sm text-gray-400">
								Create your first agent wallet with on-chain spending guardrails
							</p>
							<Button onClick={() => setCreateOpen(true)} className="mt-4" variant="outline">
								<Plus className="mr-1 h-4 w-4" /> Create Agent Wallet
							</Button>
						</div>
					)}

					{!isLoading && wallets.length > 0 && (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{wallets.map((wallet) => (
								<AgentWalletCard key={wallet.id} wallet={wallet} onRevoke={handleRevoke} />
							))}
						</div>
					)}
				</div>

				<CreateAgentWalletDialog
					open={createOpen}
					onClose={() => setCreateOpen(false)}
					treasuryId={treasuryId}
				/>
			</SidebarLayout>
		</SessionGuard>
	);
}
