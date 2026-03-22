/** Multisig Factory ABI — wallet creation via CREATE2 */
export const MultisigFactoryAbi = [
	{
		type: "function",
		name: "createWallet",
		inputs: [
			{ name: "owners", type: "address[]" },
			{ name: "threshold", type: "uint256" },
			{ name: "salt", type: "bytes32" },
		],
		outputs: [{ name: "wallet", type: "address" }],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		name: "WalletCreated",
		inputs: [
			{ name: "wallet", type: "address", indexed: true },
			{ name: "owners", type: "address[]", indexed: false },
			{ name: "threshold", type: "uint256", indexed: false },
		],
	},
] as const;

/** PolicyGuard Factory ABI — approval policy deployment */
export const PolicyGuardFactoryAbi = [
	{
		type: "function",
		name: "createGuard",
		inputs: [
			{ name: "multisig_", type: "address" },
			{
				name: "tiers_",
				type: "tuple[]",
				components: [
					{ name: "maxValue", type: "uint256" },
					{ name: "requiredConfirmations", type: "uint256" },
				],
			},
			{ name: "defaultConfirmations_", type: "uint256" },
			{ name: "allowlistEnabled_", type: "bool" },
			{ name: "initialAllowlist_", type: "address[]" },
		],
		outputs: [{ name: "guard", type: "address" }],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		name: "GuardCreated",
		inputs: [
			{ name: "multisig", type: "address", indexed: true },
			{ name: "guard", type: "address", indexed: true },
			{ name: "deployer", type: "address", indexed: true },
		],
	},
] as const;

/** Multisig Singleton ABI — transaction management + guard setup */
export const MultisigSingletonAbi = [
	{
		type: "function",
		name: "submitTransaction",
		inputs: [
			{ name: "to", type: "address" },
			{ name: "value", type: "uint256" },
			{ name: "data", type: "bytes" },
		],
		outputs: [{ name: "txId", type: "uint256" }],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "executeTransaction",
		inputs: [{ name: "txId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "setGuard",
		inputs: [{ name: "_guard", type: "address" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		name: "TransactionSubmitted",
		inputs: [
			{ name: "txId", type: "uint256", indexed: true },
			{ name: "to", type: "address", indexed: true },
			{ name: "value", type: "uint256", indexed: false },
			{ name: "data", type: "bytes", indexed: false },
		],
	},
] as const;
