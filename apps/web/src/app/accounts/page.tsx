import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TransactionSkeleton } from "@/components/skeletons";
import { getSession } from "@/lib/session";
import { AccountsContent } from "./accounts-content";

export default function AccountsPage() {
	return (
		<Suspense fallback={<TransactionSkeleton />}>
			<AccountsLoader />
		</Suspense>
	);
}

async function AccountsLoader() {
	const session = await getSession();
	if (!session) {
		redirect("/");
	}

	return (
		<AccountsContent
			treasuryName={session.treasuryName}
			authenticatedAt={session.authenticatedAt}
			treasuryId={session.treasuryId}
			tempoAddress={session.tempoAddress}
		/>
	);
}
