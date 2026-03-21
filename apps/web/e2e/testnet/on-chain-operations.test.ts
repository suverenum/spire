import { expect, test } from "@playwright/test";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";
import { withFeePayer } from "viem/tempo";

const RPC_URL = "https://rpc.moderato.tempo.xyz";
const ALPHA_USD = "0x20c0000000000000000000000000000000000001" as const;
const Tip20Abi = parseAbi([
	"function balanceOf(address) view returns (uint256)",
	"function transfer(address to, uint256 amount) external returns (bool)",
]);

/**
 * E2E: On-chain operations on Tempo Moderato testnet.
 *
 * These tests verify real blockchain interactions:
 * - Faucet funding works
 * - Token balances are queryable
 * - Token transfers execute
 *
 * Tagged as slow — run separately from the fast mock-based suite.
 */
test.describe("On-Chain Operations (Testnet)", () => {
	// Increase timeout for chain operations
	test.setTimeout(120_000);

	test("faucet funds a new wallet with AlphaUSD", async () => {
		const privateKey = generatePrivateKey();
		const account = privateKeyToAccount(privateKey);

		const publicClient = createPublicClient({
			chain: tempoModerato,
			transport: http(RPC_URL),
		});

		// Check initial balance is 0
		const balanceBefore = await publicClient.readContract({
			address: ALPHA_USD,
			abi: Tip20Abi,
			functionName: "balanceOf",
			args: [account.address],
		});
		expect(balanceBefore).toBe(0n);

		// Fund via faucet
		const { Actions } = await import("viem/tempo");
		await Actions.faucet.fundSync(publicClient, {
			account,
			timeout: 60_000,
		});

		// Balance should now be > 0
		const balanceAfter = await publicClient.readContract({
			address: ALPHA_USD,
			abi: Tip20Abi,
			functionName: "balanceOf",
			args: [account.address],
		});
		expect(balanceAfter).toBeGreaterThan(0n);
	});

	test("token transfer between two wallets", async () => {
		// Create and fund sender
		const senderKey = generatePrivateKey();
		const sender = privateKeyToAccount(senderKey);

		const publicClient = createPublicClient({
			chain: tempoModerato,
			transport: http(RPC_URL),
		});

		const { Actions } = await import("viem/tempo");
		await Actions.faucet.fundSync(publicClient, {
			account: sender,
			timeout: 60_000,
		});

		// Create recipient (unfunded)
		const recipientKey = generatePrivateKey();
		const recipient = privateKeyToAccount(recipientKey);

		const recipientBalanceBefore = await publicClient.readContract({
			address: ALPHA_USD,
			abi: Tip20Abi,
			functionName: "balanceOf",
			args: [recipient.address],
		});
		expect(recipientBalanceBefore).toBe(0n);

		// Transfer 1 AlphaUSD from sender to recipient
		const walletClient = createWalletClient({
			account: sender,
			chain: tempoModerato,
			transport: http(RPC_URL),
		});

		const amount = 1_000_000n; // 1 AUSD (6 decimals)
		const hash = await walletClient.writeContract({
			address: ALPHA_USD,
			abi: Tip20Abi,
			functionName: "transfer",
			args: [recipient.address, amount],
		});

		const receipt = await publicClient.waitForTransactionReceipt({ hash });
		expect(receipt.status).toBe("success");

		// Verify recipient received the tokens
		const recipientBalanceAfter = await publicClient.readContract({
			address: ALPHA_USD,
			abi: Tip20Abi,
			functionName: "balanceOf",
			args: [recipient.address],
		});
		expect(recipientBalanceAfter).toBe(amount);
	});

	test("deploy GuardianFactory contract on testnet", async () => {
		const deployerKey = generatePrivateKey();
		const deployer = privateKeyToAccount(deployerKey);

		const publicClient = createPublicClient({
			chain: tempoModerato,
			transport: http(RPC_URL),
		});

		// Fund deployer
		const { Actions } = await import("viem/tempo");
		await Actions.faucet.fundSync(publicClient, {
			account: deployer,
			timeout: 60_000,
		});

		// Read the compiled artifact
		const { readFileSync } = await import("node:fs");
		const { dirname, resolve } = await import("node:path");
		const { fileURLToPath } = await import("node:url");
		const __dirname = dirname(fileURLToPath(import.meta.url));

		let artifact: { abi: unknown; bytecode: { object: string } };
		try {
			artifact = JSON.parse(
				readFileSync(
					resolve(__dirname, "../../../../contracts/out/GuardianFactory.sol/GuardianFactory.json"),
					"utf-8",
				),
			);
		} catch {
			// If artifact not built, skip gracefully
			test.skip();
			return;
		}

		// Use fee payer transport (Tempo Moderato sponsor pays gas)
		const SPONSOR_URL = "https://sponsor.moderato.tempo.xyz";
		const transport = withFeePayer(http(RPC_URL), http(SPONSOR_URL));
		const walletClient = createWalletClient({
			account: deployer,
			chain: tempoModerato,
			transport,
		});

		const hash = await walletClient.deployContract({
			abi: artifact.abi as [],
			bytecode: artifact.bytecode.object as `0x${string}`,
			gas: 10_000_000n,
		});

		const receipt = await publicClient.waitForTransactionReceipt({ hash });
		expect(receipt.status).toBe("success");
		expect(receipt.contractAddress).toBeTruthy();

		// Verify factory is deployed by checking code exists at address
		const code = await publicClient.getCode({ address: receipt.contractAddress! });
		expect(code).toBeTruthy();
		expect(code!.length).toBeGreaterThan(2); // More than just "0x"
	});
});
