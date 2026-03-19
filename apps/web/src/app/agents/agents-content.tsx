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
							<h1 className="text-2xl font-semibold">Agent wallets</h1>
							<p className="text-muted-foreground text-sm">
								Create guardrailed wallets for your AI agents
							</p>
						</div>
						<Button onClick={() => setCreateOpen(true)} data-testid="create-agent-btn">
							<Plus className="mr-1 h-4 w-4" /> Create
						</Button>
					</div>

					{isLoading && (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{[1, 2, 3].map((i) => (
								<div key={i} className="bg-muted h-48 animate-pulse rounded-lg" />
							))}
						</div>
					)}

					{!isLoading && wallets.length === 0 && (
						<div className="border-border flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
							<Bot className="text-muted-foreground mb-3 h-12 w-12" />
							<h3 className="text-foreground text-lg font-medium">No agent wallets yet</h3>
							<p className="text-muted-foreground mt-1 text-sm">
								Create your first agent wallet with on-chain spending guardrails
							</p>
							<Button onClick={() => setCreateOpen(true)} className="mt-4" variant="outline">
								<Plus className="mr-1 h-4 w-4" /> Create
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
