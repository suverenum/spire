import type { PublicClient, TransactionReceipt } from "viem";

/** Wait for tx receipt and throw if the transaction reverted on-chain. */
export async function confirmTx(
	publicClient: PublicClient,
	hash: `0x${string}`,
	context: string,
): Promise<TransactionReceipt> {
	const receipt = await publicClient.waitForTransactionReceipt({ hash });
	if (receipt.status === "reverted") {
		throw new Error(`Transaction reverted during ${context} (tx: ${hash})`);
	}
	return receipt;
}
