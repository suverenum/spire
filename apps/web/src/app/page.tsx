import { redirect } from "next/navigation";
import { Suspense } from "react";
import { WelcomeScreen } from "@/domain/auth/components/welcome-screen";
import { getSession } from "@/lib/session";

export default function Home() {
	return (
		<Suspense fallback={<HomeSkeleton />}>
			<HomeLoader />
		</Suspense>
	);
}

function HomeSkeleton() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background">
			<div className="w-full max-w-sm text-center">
				<h1 className="text-4xl font-semibold tracking-tight">Goldhord</h1>
				<p className="mt-2 text-muted-foreground">Treasury management on Tempo blockchain</p>
			</div>
		</div>
	);
}

async function HomeLoader() {
	const session = await getSession();

	if (session) {
		redirect("/dashboard");
	}

	return <WelcomeScreen />;
}
