import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TransactionSkeleton } from "@/components/skeletons";
import { getSession } from "@/lib/session";
import { SwapContent } from "./swap-content";

export default function SwapPage() {
	return (
		<Suspense fallback={<TransactionSkeleton />}>
			<SwapLoader />
		</Suspense>
	);
}

async function SwapLoader() {
	const session = await getSession();
	if (!session) {
		redirect("/");
	}

	return (
		<SwapContent
			treasuryName={session.treasuryName}
			authenticatedAt={session.authenticatedAt}
			treasuryId={session.treasuryId}
		/>
	);
}
