import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TransactionDetailContent } from "./transaction-detail-content";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const { id } = await params;

  return (
    <TransactionDetailContent
      transactionId={id}
      tempoAddress={session.tempoAddress}
      treasuryName={session.treasuryName}
    />
  );
}
