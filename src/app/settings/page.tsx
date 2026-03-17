import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SettingsContent } from "./settings-content";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  return (
    <SettingsContent
      treasuryId={session.treasuryId}
      treasuryName={session.treasuryName}
    />
  );
}
