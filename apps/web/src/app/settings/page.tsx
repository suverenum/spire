import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { SettingsContent } from "./settings-content";

export default function SettingsPage() {
	return (
		<Suspense fallback={<div className="bg-background min-h-screen" />}>
			<SettingsLoader />
		</Suspense>
	);
}

async function SettingsLoader() {
	const session = await getSession();
	if (!session) {
		redirect("/");
	}

	return (
		<SettingsContent
			treasuryName={session.treasuryName}
			authenticatedAt={session.authenticatedAt}
		/>
	);
}
