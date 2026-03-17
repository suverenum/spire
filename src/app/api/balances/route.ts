import { NextRequest, NextResponse } from "next/server";
import { fetchBalances } from "@/lib/tempo/client";
import { addressSchema } from "@/lib/validations";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const address = request.nextUrl.searchParams.get("address");
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  if (parsed.data.toLowerCase() !== session.tempoAddress.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const balances = await fetchBalances(parsed.data as `0x${string}`);
    return NextResponse.json({
      balances: balances.map((b) => ({
        ...b,
        balance: b.balance.toString(),
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch balances" },
      { status: 502 },
    );
  }
}
