import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TransactionSkeleton } from "@/components/skeletons";
import { getSession } from "@/lib/session";
import { AgentsContent } from "./agents-content";

export default function AgentsPage() {
	return (
		<Suspense fallback={<TransactionSkeleton />}>
			<AgentsLoader />
		</Suspense>
	);
}

async function AgentsLoader() {
	const session = await getSession();
	if (!session) {
		redirect("/");
	}

	return (
		<AgentsContent
			treasuryName={session.treasuryName}
			authenticatedAt={session.authenticatedAt}
			treasuryId={session.treasuryId}
		/>
	);
}
