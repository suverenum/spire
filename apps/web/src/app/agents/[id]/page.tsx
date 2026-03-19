import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TransactionSkeleton } from "@/components/skeletons";
import { getSession } from "@/lib/session";
import { AgentDetailContent } from "./agent-detail-content";

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
	return (
		<Suspense fallback={<TransactionSkeleton />}>
			<AgentDetailLoader params={params} />
		</Suspense>
	);
}

async function AgentDetailLoader({ params }: { params: Promise<{ id: string }> }) {
	const session = await getSession();
	if (!session) {
		redirect("/");
	}

	const { id } = await params;

	return (
		<AgentDetailContent
			walletId={id}
			treasuryName={session.treasuryName}
			authenticatedAt={session.authenticatedAt}
			treasuryId={session.treasuryId}
		/>
	);
}
