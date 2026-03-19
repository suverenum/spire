import { NextResponse } from "next/server";
import { reconcilePendingBridgeDeposits } from "@/domain/bridge/actions/reconcile-pending-deposits";

export async function POST(request: Request) {
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const result = await reconcilePendingBridgeDeposits();
	return NextResponse.json(result);
}
