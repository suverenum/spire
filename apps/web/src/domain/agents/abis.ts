/** Guardian contract ABI subset for owner/admin actions */
export const GuardianOwnerAbi = [
	{
		type: "function",
		name: "updateLimits",
		inputs: [
			{ name: "_maxPerTx", type: "uint256" },
			{ name: "_dailyLimit", type: "uint256" },
			{ name: "_spendingCap", type: "uint256" },
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "addRecipient",
		inputs: [{ name: "r", type: "address" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "removeRecipient",
		inputs: [{ name: "r", type: "address" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "addToken",
		inputs: [{ name: "t", type: "address" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "withdraw",
		inputs: [{ name: "token", type: "address" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "approvePay",
		inputs: [{ name: "proposalId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "rejectPay",
		inputs: [{ name: "proposalId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "proposalCount",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "proposals",
		inputs: [{ name: "", type: "uint256" }],
		outputs: [
			{ name: "token", type: "address" },
			{ name: "to", type: "address" },
			{ name: "amount", type: "uint256" },
			{ name: "status", type: "uint8" },
			{ name: "createdAt", type: "uint256" },
			{ name: "reservedDay", type: "uint256" },
		],
		stateMutability: "view",
	},
	{
		type: "event",
		name: "PaymentProposed",
		inputs: [
			{ name: "proposalId", type: "uint256", indexed: true },
			{ name: "token", type: "address", indexed: true },
			{ name: "to", type: "address", indexed: true },
			{ name: "amount", type: "uint256", indexed: false },
		],
	},
] as const;

/** TIP-20 token transfer ABI */
export const Tip20Abi = [
	{
		type: "function",
		name: "transfer",
		inputs: [
			{ name: "to", type: "address" },
			{ name: "amount", type: "uint256" },
		],
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "nonpayable",
	},
] as const;

/** Multisig contract ABI subset for confirm/execute operations */
export const MultisigAbi = [
	{
		type: "function",
		name: "confirmTransaction",
		inputs: [{ name: "transactionId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "executeTransaction",
		inputs: [{ name: "transactionId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "submitTransaction",
		inputs: [
			{ name: "destination", type: "address" },
			{ name: "value", type: "uint256" },
			{ name: "data", type: "bytes" },
		],
		outputs: [{ name: "transactionId", type: "uint256" }],
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
