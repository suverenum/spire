export const TEMPO_RPC_URL = "https://rpc.moderato.tempo.xyz";
export const TEMPO_CHAIN_ID = 42431;
export const TEMPO_EXPLORER_URL = "https://explore.tempo.xyz";

export const SUPPORTED_TOKENS = {
  AlphaUSD: {
    name: "AlphaUSD",
    symbol: "AUSD",
    decimals: 6,
    address: "0x1111111111111111111111111111111111111111" as `0x${string}`,
  },
  BetaUSD: {
    name: "BetaUSD",
    symbol: "BUSD",
    decimals: 6,
    address: "0x2222222222222222222222222222222222222222" as `0x${string}`,
  },
  pathUSD: {
    name: "pathUSD",
    symbol: "pUSD",
    decimals: 6,
    address: "0x3333333333333333333333333333333333333333" as `0x${string}`,
  },
  ThetaUSD: {
    name: "ThetaUSD",
    symbol: "TUSD",
    decimals: 6,
    address: "0x4444444444444444444444444444444444444444" as `0x${string}`,
  },
} as const;

export type TokenName = keyof typeof SUPPORTED_TOKENS;

export const SESSION_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
export const SESSION_COOKIE_NAME = "spire-session";

export const CACHE_KEYS = {
  balances: (address: string) => ["balances", address] as const,
  transactions: (address: string) => ["transactions", address] as const,
} as const;
