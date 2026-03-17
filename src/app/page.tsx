import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { treasuries } from "@/db/schema";
import { LockScreen } from "@/domain/auth/components/lock-screen";

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  // Check if a treasury exists to show lock screen
  const existing = await db.select().from(treasuries).limit(1);
  const treasury = existing[0];

  if (treasury) {
    return <LockScreen treasuryId={treasury.id} treasuryName={treasury.name} />;
  }

  // No treasury yet — show onboarding
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Spire</h1>
        <p className="mt-2 text-gray-500">
          Treasury management on Tempo blockchain
        </p>
        <a
          href="/create"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-gray-900 px-6 text-base font-medium text-white hover:bg-gray-800"
        >
          Create Treasury
        </a>
      </div>
    </div>
  );
}
