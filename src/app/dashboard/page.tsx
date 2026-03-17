import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { DashboardContent } from "./dashboard-content";
import { DashboardSkeleton } from "@/components/skeletons";

// Static shell rendered at build time via PPR; dynamic content streams in.
export default function DashboardPage() {
	return (
		<Suspense fallback={<DashboardSkeleton />}>
			<DashboardLoader />
		</Suspense>
	);
}

async function DashboardLoader() {
	const session = await getSession();
	if (!session) {
		redirect("/");
	}

	return (
		<DashboardContent
			treasuryName={session.treasuryName}
			tempoAddress={session.tempoAddress}
			authenticatedAt={session.authenticatedAt}
		/>
	);
}
