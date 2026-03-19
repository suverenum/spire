import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TransactionSkeleton } from "@/components/skeletons";
import { getSession } from "@/lib/session";
import { CashAccountsContent } from "./cash-accounts-content";

export default function CashAccountsPage() {
	return (
		<Suspense fallback={<TransactionSkeleton />}>
			<CashAccountsLoader />
		</Suspense>
	);
}

async function CashAccountsLoader() {
	const session = await getSession();
	if (!session) {
		redirect("/");
	}

	return (
		<CashAccountsContent
			treasuryName={session.treasuryName}
			authenticatedAt={session.authenticatedAt}
			treasuryId={session.treasuryId}
		/>
	);
}
