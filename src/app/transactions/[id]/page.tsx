import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TransactionDetailContent } from "./transaction-detail-content";

interface Props {
	params: Promise<{ id: string }>;
}

export default function TransactionDetailPage({ params }: Props) {
	return (
		<Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
			<TransactionDetailLoader params={params} />
		</Suspense>
	);
}

async function TransactionDetailLoader({ params }: Props) {
	const session = await getSession();
	if (!session) {
		redirect("/");
	}

	const { id } = await params;

	return (
		<TransactionDetailContent
			transactionId={id}
			tempoAddress={session.tempoAddress}
			treasuryName={session.treasuryName}
			authenticatedAt={session.authenticatedAt}
		/>
	);
}
