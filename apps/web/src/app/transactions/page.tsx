import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TransactionSkeleton } from "@/components/skeletons";
import { getSession } from "@/lib/session";
import { TransactionsContent } from "./transactions-content";

export default function TransactionsPage() {
	return (
		<Suspense fallback={<TransactionSkeleton />}>
			<TransactionsLoader />
		</Suspense>
	);
}

async function TransactionsLoader() {
	const session = await getSession();
	if (!session) {
		redirect("/");
	}

	return (
		<TransactionsContent
			tempoAddress={session.tempoAddress}
			treasuryName={session.treasuryName}
			authenticatedAt={session.authenticatedAt}
		/>
	);
}
