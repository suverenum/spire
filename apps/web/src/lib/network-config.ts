/**
 * Network configuration for Tempo blockchain.
 *
 * Selected by NEXT_PUBLIC_TEMPO_NETWORK env var ("testnet" | "mainnet").
 * Defaults to "testnet" when not set.
 *
 * All chain-specific values (RPC URLs, chain IDs, token addresses,
 * contract addresses, explorer URLs) are derived from this config.
 */

export type TempoNetwork = "testnet" | "mainnet";

export interface NetworkConfig {
	/** Human-readable network name */
	name: string;
	/** JSON-RPC endpoint */
	rpcUrl: string;
	/** WebSocket RPC endpoint */
	wsUrl: string;
	/** Fee sponsor/relayer URL */
	sponsorUrl: string;
	/** Block explorer URL */
	explorerUrl: string;
	/** EVM chain ID */
	chainId: number;
	/** Whether this network has a faucet (testnet only) */
	hasFaucet: boolean;
	/** Deployed contract addresses */
	contracts: {
		guardianFactory: `0x${string}`;
		multisigFactory: `0x${string}`;
		policyGuardFactory: `0x${string}`;
	};
	/** Available stablecoin tokens */
	tokens: {
		[key: string]: {
			name: string;
			symbol: string;
			decimals: number;
			address: `0x${string}`;
		};
	};
	/** Tokens available for account creation (subset of tokens) */
	accountTokenNames: string[];
}

const TESTNET_CONFIG: NetworkConfig = {
	name: "Tempo Moderato Testnet",
	rpcUrl: "https://rpc.moderato.tempo.xyz",
	wsUrl: "wss://rpc.moderato.tempo.xyz",
	sponsorUrl: "https://sponsor.moderato.tempo.xyz",
	explorerUrl: "https://explore.moderato.tempo.xyz",
	chainId: 42431,
	hasFaucet: true,
	contracts: {
		guardianFactory: "0xeffb75d8e4e4622c523bd0b4f2b3ca9e3954b131",
		multisigFactory: "0xf6888688CAAed87352E975964400493429930342",
		policyGuardFactory: "0x53AbdcC50268bd4283187Bef5a48942E9e1aa161",
	},
	tokens: {
		AlphaUSD: {
			name: "AlphaUSD",
			symbol: "AUSD",
			decimals: 6,
			address: "0x20c0000000000000000000000000000000000001",
		},
		BetaUSD: {
			name: "BetaUSD",
			symbol: "BUSD",
			decimals: 6,
			address: "0x20c0000000000000000000000000000000000002",
		},
		pathUSD: {
			name: "pathUSD",
			symbol: "pUSD",
			decimals: 6,
			address: "0x20c0000000000000000000000000000000000000",
		},
		ThetaUSD: {
			name: "ThetaUSD",
			symbol: "TUSD",
			decimals: 6,
			address: "0x20c0000000000000000000000000000000000003",
		},
	},
	accountTokenNames: ["AlphaUSD"],
};

const MAINNET_CONFIG: NetworkConfig = {
	name: "Tempo",
	rpcUrl: "https://rpc.tempo.xyz",
	wsUrl: "wss://rpc.tempo.xyz",
	sponsorUrl: "https://sponsor.tempo.xyz",
	explorerUrl: "https://explore.mainnet.tempo.xyz",
	chainId: 4217,
	hasFaucet: false,
	contracts: {
		// Placeholder — deploy before mainnet launch
		guardianFactory: "0x0000000000000000000000000000000000000000",
		multisigFactory: "0x0000000000000000000000000000000000000000",
		policyGuardFactory: "0x0000000000000000000000000000000000000000",
	},
	tokens: {
		USDC: {
			name: "USDC",
			symbol: "USDC",
			decimals: 6,
			address: "0x20C000000000000000000000b9537d11c60E8b50",
		},
	},
	accountTokenNames: ["USDC"],
};

const NETWORK_CONFIGS: Record<TempoNetwork, NetworkConfig> = {
	testnet: TESTNET_CONFIG,
	mainnet: MAINNET_CONFIG,
};

/** Current network, selected by NEXT_PUBLIC_TEMPO_NETWORK env var */
export const TEMPO_NETWORK: TempoNetwork =
	(process.env.NEXT_PUBLIC_TEMPO_NETWORK as TempoNetwork) || "testnet";

/** Active network configuration */
export const networkConfig: NetworkConfig = NETWORK_CONFIGS[TEMPO_NETWORK];
