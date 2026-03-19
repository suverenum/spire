import { tempo, tempoModerato } from "viem/chains";
import { withFeePayer } from "viem/tempo";
import { createConfig, http } from "wagmi";
import { KeyManager, webAuthn } from "wagmi/tempo";
import { TEMPO_NETWORK } from "./network-config";
import { TEMPO_RPC_URL, TEMPO_SPONSOR_URL } from "./constants";

const chain = TEMPO_NETWORK === "mainnet" ? tempo : tempoModerato;
const feePayerTransport = withFeePayer(http(TEMPO_RPC_URL), http(TEMPO_SPONSOR_URL));

export const wagmiConfig = createConfig({
	chains: [chain],
	connectors: [
		webAuthn({
			keyManager: KeyManager.localStorage(),
		}),
	],
	multiInjectedProviderDiscovery: false,
	transports: {
		[tempoModerato.id]: feePayerTransport,
		[tempo.id]: feePayerTransport,
	},
});
