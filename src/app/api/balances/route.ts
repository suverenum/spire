import { NextRequest, NextResponse } from "next/server";
import { fetchBalancesForAddress } from "@/domain/payments/queries/fetch-balances";
import { addressSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const balances = await fetchBalancesForAddress(parsed.data as `0x${string}`);
  return NextResponse.json({
    balances: balances.map((b) => ({
      ...b,
      balance: b.balance.toString(),
    })),
  });
}
