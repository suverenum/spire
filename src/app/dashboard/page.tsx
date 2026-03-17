import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage() {
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
