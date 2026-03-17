import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

export interface FeeSponsorConfig {
  enabled: boolean;
  mode: "remote" | "local";
  feePayer?: PrivateKeyAccount;
}

/**
 * Returns the fee sponsorship configuration.
 *
 * - If TEMPO_FEE_PAYER_KEY is set, uses a local fee payer account (self-hosted sponsorship).
 * - Otherwise, uses the public testnet sponsor service (feePayer: true).
 */
export function getFeeSponsorConfig(): FeeSponsorConfig {
  const feePayerKey = process.env.TEMPO_FEE_PAYER_KEY;

  if (feePayerKey) {
    return {
      enabled: true,
      mode: "local",
      feePayer: privateKeyToAccount(feePayerKey as `0x${string}`),
    };
  }

  // Default: use Tempo's public testnet sponsor service
  return {
    enabled: true,
    mode: "remote",
  };
}

/**
 * Returns the feePayer parameter for Tempo SDK transfer calls.
 * - Local mode: returns the PrivateKeyAccount
 * - Remote mode: returns `true` (routes to public sponsor service)
 */
export function getFeePayer(): PrivateKeyAccount | true {
  const config = getFeeSponsorConfig();
  if (config.mode === "local" && config.feePayer) {
    return config.feePayer;
  }
  return true;
}
