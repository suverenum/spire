import { NextRequest, NextResponse } from "next/server";
import { fetchTransactionsForAddress } from "@/domain/payments/queries/fetch-transactions";
import { addressSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const transactions = await fetchTransactionsForAddress(
    parsed.data as `0x${string}`,
  );
  return NextResponse.json({
    transactions: transactions.map((t) => ({
      ...t,
      amount: t.amount.toString(),
      timestamp: t.timestamp.toISOString(),
    })),
  });
}
