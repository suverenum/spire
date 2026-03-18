import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TransactionSkeleton } from "@/components/skeletons";
import { getSession } from "@/lib/session";
import { AccountDetailContent } from "./account-detail-content";

export default async function AccountDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	return (
		<Suspense fallback={<TransactionSkeleton />}>
			<AccountDetailLoader accountId={id} />
		</Suspense>
	);
}

async function AccountDetailLoader({ accountId }: { accountId: string }) {
	const session = await getSession();
	if (!session) {
		redirect("/");
	}

	return (
		<AccountDetailContent
			accountId={accountId}
			treasuryName={session.treasuryName}
			authenticatedAt={session.authenticatedAt}
			treasuryId={session.treasuryId}
		/>
	);
}
