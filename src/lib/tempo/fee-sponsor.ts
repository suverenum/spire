import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

/**
 * Returns the feePayer parameter for Tempo SDK transfer calls.
 * - If TEMPO_FEE_PAYER_KEY is set, returns a local PrivateKeyAccount.
 * - Otherwise, returns `true` to route to Tempo's public testnet sponsor service.
 */
export function getFeePayer(): PrivateKeyAccount | true {
  const key = process.env.TEMPO_FEE_PAYER_KEY;
  if (key) {
    return privateKeyToAccount(key as `0x${string}`);
  }
  return true;
}
