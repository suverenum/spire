import type { Chain } from "viem";
import { withFeePayer } from "viem/tempo";
import { createConfig, http } from "wagmi";
import { KeyManager, webAuthn } from "wagmi/tempo";
import { ACCOUNT_TOKENS } from "./constants";
import { env } from "./env";

const tempoChain: Chain = {
	id: env.NEXT_PUBLIC_TEMPO_CHAIN_ID,
	name: env.NEXT_PUBLIC_APP_ENV === "production" ? "Tempo" : "Tempo Testnet",
	nativeCurrency: { name: "TEMPO", symbol: "TEMPO", decimals: 18 },
	rpcUrls: {
		default: { http: [env.NEXT_PUBLIC_TEMPO_RPC_HTTP] },
	},
	blockExplorers: {
		default: {
			name: "Tempo Explorer",
			url: env.NEXT_PUBLIC_TEMPO_EXPLORER_URL,
		},
	},
};

/** Fee token address for gas payments (USDC on mainnet, AlphaUSD on testnet) */
export const FEE_TOKEN = ACCOUNT_TOKENS[0]?.address;

export const wagmiConfig = createConfig({
	chains: [tempoChain],
	connectors: [
		webAuthn({
			keyManager: KeyManager.localStorage(),
		}),
	],
	multiInjectedProviderDiscovery: false,
	transports: {
		[tempoChain.id]: env.NEXT_PUBLIC_TEMPO_SPONSOR_URL
			? withFeePayer(http(), http(env.NEXT_PUBLIC_TEMPO_SPONSOR_URL))
			: http(),
	},
});
