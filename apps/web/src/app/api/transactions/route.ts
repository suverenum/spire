import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { getSession } from "@/lib/session";
import { fetchTransactions } from "@/lib/tempo/client";
import { addressSchema } from "@/lib/validations";

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

	const lowerAddress = parsed.data.toLowerCase();

	// Allow the treasury root address or any account wallet belonging to this treasury
	if (lowerAddress !== session.tempoAddress.toLowerCase()) {
		const ownedAccounts = await db.query.accounts.findMany({
			where: eq(accounts.treasuryId, session.treasuryId),
			columns: { walletAddress: true },
		});
		const ownedAddresses = new Set(ownedAccounts.map((a) => a.walletAddress.toLowerCase()));
		if (!ownedAddresses.has(lowerAddress)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
	}

	try {
		const transactions = await fetchTransactions(parsed.data as `0x${string}`);
		return NextResponse.json({
			transactions: transactions.map((t) => ({
				...t,
				amount: t.amount.toString(),
				timestamp: t.timestamp.toISOString(),
			})),
		});
	} catch {
		return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 502 });
	}
}
