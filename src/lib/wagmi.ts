import { createConfig, http } from "wagmi";
import { tempoModerato } from "viem/chains";
import { withFeePayer } from "viem/tempo";
import { KeyManager, webAuthn } from "wagmi/tempo";

export const wagmiConfig = createConfig({
	chains: [tempoModerato],
	connectors: [
		webAuthn({
			keyManager: KeyManager.localStorage(),
		}),
	],
	multiInjectedProviderDiscovery: false,
	transports: {
		[tempoModerato.id]: withFeePayer(
			http(),
			http("https://sponsor.moderato.tempo.xyz"),
		),
	},
});
