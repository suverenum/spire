import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readContract, waitForTransactionReceipt } from "viem/actions";
import { tempoModerato } from "viem/chains";
import { requireAddress, requireHexKey } from "./env";

const agent = privateKeyToAccount(requireHexKey("AGENT_KEY"));
const wallet = createWalletClient({
	account: agent,
	chain: tempoModerato,
	transport: http("https://rpc.moderato.tempo.xyz"),
});
const pub = createPublicClient({
	chain: tempoModerato,
	transport: http("https://rpc.moderato.tempo.xyz"),
});
const TOKEN = requireAddress("TOKEN_ADDRESS");
const GUARDIAN = requireAddress("GUARDIAN_ADDRESS");
const abi = parseAbi([
	"function transfer(address to, uint256 amount) external returns (bool)",
	"function balanceOf(address) external view returns (uint256)",
]);

const hash = await wallet.writeContract({
	address: TOKEN,
	abi,
	functionName: "transfer",
	args: [GUARDIAN, 10_000_000n],
});
await waitForTransactionReceipt(pub, { hash });
const balance = await readContract(pub, {
	address: TOKEN,
	abi,
	functionName: "balanceOf",
	args: [GUARDIAN],
});
console.log("Guardian token balance:", Number(balance) / 1e6, "USD");
console.log("Transfer tx:", hash);
