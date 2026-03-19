import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TransactionSkeleton } from "@/components/skeletons";
import { getSession } from "@/lib/session";
import { AccountDetailContent } from "./account-detail-content";

interface Props {
	params: Promise<{ id: string }>;
}

export default function AccountDetailPage({ params }: Props) {
	return (
		<Suspense fallback={<TransactionSkeleton />}>
			<AccountDetailLoader params={params} />
		</Suspense>
	);
}

async function AccountDetailLoader({ params }: Props) {
	const session = await getSession();
	if (!session) {
		redirect("/");
	}

	const { id } = await params;

	return (
		<AccountDetailContent
			accountId={id}
			treasuryName={session.treasuryName}
			authenticatedAt={session.authenticatedAt}
			treasuryId={session.treasuryId}
			tempoAddress={session.tempoAddress}
		/>
	);
}
