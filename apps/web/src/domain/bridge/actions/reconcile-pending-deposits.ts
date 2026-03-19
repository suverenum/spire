import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bridgeDeposits } from "@/db/schema";

const LZ_SCAN_API = "https://scan.layerzero-api.com/v1";
const BATCH_SIZE = 50;
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

interface LzMessage {
	guid?: string;
	status?: { name: string };
	destination?: { tx?: { txHash?: string } };
}

interface LzScanResponse {
	data?: LzMessage[];
}

export async function reconcilePendingBridgeDeposits(): Promise<{
	processed: number;
	completed: number;
	failed: number;
}> {
	const pending = await db.query.bridgeDeposits.findMany({
		where: inArray(bridgeDeposits.status, ["pending", "bridging"]),
		orderBy: (deposits, { asc }) => [asc(deposits.initiatedAt)],
		limit: BATCH_SIZE,
	});

	let completed = 0;
	let failed = 0;

	for (const deposit of pending) {
		try {
			const res = await fetch(`${LZ_SCAN_API}/messages/tx/${deposit.sourceTxHash}`);
			if (!res.ok) continue;

			const data: LzScanResponse = await res.json();
			const message = data.data?.[0];
			if (!message) {
				const age = Date.now() - new Date(deposit.initiatedAt).getTime();
				if (age > STALE_THRESHOLD_MS) {
					const staleResult = await db
						.update(bridgeDeposits)
						.set({ status: "failed" })
						.where(
							and(eq(bridgeDeposits.id, deposit.id), eq(bridgeDeposits.status, deposit.status)),
						)
						.returning({ id: bridgeDeposits.id });
					if (staleResult.length > 0) failed++;
				}
				continue;
			}

			if (message.status?.name === "DELIVERED") {
				const deliveredResult = await db
					.update(bridgeDeposits)
					.set({
						status: "completed",
						lzMessageHash: message.guid,
						tempoTxHash: message.destination?.tx?.txHash,
						completedAt: new Date(),
					})
					.where(
						and(
							eq(bridgeDeposits.id, deposit.id),
							inArray(bridgeDeposits.status, ["pending", "bridging"]),
						),
					)
					.returning({ id: bridgeDeposits.id });
				if (deliveredResult.length > 0) completed++;
				continue;
			}

			if (message.status?.name === "FAILED") {
				const failedResult = await db
					.update(bridgeDeposits)
					.set({ status: "failed" })
					.where(
						and(
							eq(bridgeDeposits.id, deposit.id),
							inArray(bridgeDeposits.status, ["pending", "bridging"]),
						),
					)
					.returning({ id: bridgeDeposits.id });
				if (failedResult.length > 0) failed++;
				continue;
			}

			await db
				.update(bridgeDeposits)
				.set({
					status: "bridging",
					lzMessageHash: message.guid ?? deposit.lzMessageHash,
				})
				.where(
					and(
						eq(bridgeDeposits.id, deposit.id),
						inArray(bridgeDeposits.status, ["pending", "bridging"]),
					),
				);
		} catch (err) {
			console.error(`Bridge reconciler: failed to process deposit ${deposit.id}:`, err);
		}
	}

	return { processed: pending.length, completed, failed };
}
