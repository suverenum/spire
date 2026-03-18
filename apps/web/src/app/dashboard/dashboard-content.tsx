"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SessionGuard } from "@/domain/auth/components/session-guard";
import { BalanceCards } from "@/domain/payments/components/balance-cards";
import { ReceiveSheet } from "@/domain/payments/components/receive-sheet";
import { RecentTransactions } from "@/domain/payments/components/recent-transactions";
import { SendPaymentForm } from "@/domain/payments/components/send-payment-form";
import { WebSocketBanner } from "@/domain/payments/components/websocket-banner";
import { useIncomingPayments } from "@/domain/payments/hooks/use-incoming-payments";
import { TreasuryHeader } from "@/domain/treasury/components/treasury-header";

interface DashboardContentProps {
	treasuryName: string;
	tempoAddress: `0x${string}`;
	authenticatedAt: number;
}

export function DashboardContent({
	treasuryName,
	tempoAddress,
	authenticatedAt,
}: DashboardContentProps) {
	const [sendOpen, setSendOpen] = useState(false);
	const [receiveOpen, setReceiveOpen] = useState(false);
	const { isConnected } = useIncomingPayments(tempoAddress);

	return (
		<SessionGuard authenticatedAt={authenticatedAt}>
			<div className="min-h-screen bg-gray-50">
				<TreasuryHeader name={treasuryName} address={tempoAddress} />

				<main className="mx-auto max-w-4xl px-4 py-6">
					<div className="mb-6 flex flex-col gap-4">
						<WebSocketBanner isConnected={isConnected} />
						<BalanceCards address={tempoAddress} />

						<div className="flex gap-3">
							<Button onClick={() => setSendOpen(true)} className="flex-1" size="lg">
								<ArrowUpRight className="h-5 w-5" />
								Send
							</Button>
							<Button
								onClick={() => setReceiveOpen(true)}
								variant="outline"
								className="flex-1"
								size="lg"
							>
								<ArrowDownLeft className="h-5 w-5" />
								Receive
							</Button>
						</div>
					</div>

					<RecentTransactions address={tempoAddress} />
				</main>

				<SendPaymentForm
					open={sendOpen}
					onClose={() => setSendOpen(false)}
					fromAddress={tempoAddress}
				/>
				<ReceiveSheet
					open={receiveOpen}
					onClose={() => setReceiveOpen(false)}
					address={tempoAddress}
				/>
			</div>
		</SessionGuard>
	);
}
