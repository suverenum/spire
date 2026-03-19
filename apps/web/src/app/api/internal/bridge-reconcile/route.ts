import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { reconcilePendingBridgeDeposits } from "@/domain/bridge/actions/reconcile-pending-deposits";

export async function GET(request: Request) {
	const cronSecret = process.env.CRON_SECRET;
	if (!cronSecret) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const authHeader = request.headers.get("authorization");
	const expected = `Bearer ${cronSecret}`;
	if (
		!authHeader ||
		authHeader.length !== expected.length ||
		!timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
	) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const result = await reconcilePendingBridgeDeposits();
	return NextResponse.json(result);
}
