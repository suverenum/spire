import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TransactionsContent } from "./transactions-content";

export default async function TransactionsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  return (
    <TransactionsContent
      tempoAddress={session.tempoAddress}
      treasuryName={session.treasuryName}
    />
  );
}
