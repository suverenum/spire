import { describe, expect, it } from "vitest";
import { decodeTransactionDescription } from "./decode-transaction";

const WALLET = "0x1111111111111111111111111111111111111111";
const USDC = "0x20c0000000000000000000000000000000000001";
const RECIPIENT = "0x2222222222222222222222222222222222222222";

// ERC20 transfer(address,uint256) calldata
function makeTransferData(to: string, amountHex: string): string {
	const selector = "0xa9059cbb";
	const paddedTo = to.slice(2).padStart(64, "0");
	const paddedAmount = amountHex.padStart(64, "0");
	return `${selector}${paddedTo}${paddedAmount}`;
}

// ERC20 approve(address,uint256) calldata
function makeApproveData(spender: string, amountHex: string): string {
	const selector = "0x095ea7b3";
	const paddedSpender = spender.slice(2).padStart(64, "0");
	const paddedAmount = amountHex.padStart(64, "0");
	return `${selector}${paddedSpender}${paddedAmount}`;
}

// addOwner(address) calldata
function makeAddOwnerData(owner: string): string {
	const selector = "0x7065cb48";
	const paddedOwner = owner.slice(2).padStart(64, "0");
	return `${selector}${paddedOwner}`;
}

describe("decodeTransactionDescription", () => {
	it("decodes ERC20 transfer with known token", () => {
		const data = makeTransferData(RECIPIENT, "2540BE400"); // 10000e6 = 10000000000
		const result = decodeTransactionDescription(USDC, data, "0", WALLET);
		expect(result).toContain("Transfer");
		expect(result).toContain("AlphaUSD");
		expect(result).toContain("2222...2222");
	});

	it("decodes ERC20 approve", () => {
		const data = makeApproveData(RECIPIENT, "2540BE400");
		const result = decodeTransactionDescription(USDC, data, "0", WALLET);
		expect(result).toContain("Approve");
		expect(result).toContain("AlphaUSD");
	});

	it("decodes addOwner self-call", () => {
		const data = makeAddOwnerData(RECIPIENT);
		const result = decodeTransactionDescription(WALLET, data, "0", WALLET);
		expect(result).toContain("Add signer");
		expect(result).toContain("2222...2222");
	});

	it("decodes self-call with unknown selector", () => {
		const result = decodeTransactionDescription(
			WALLET,
			"0xdeadbeef",
			"0",
			WALLET,
		);
		expect(result).toBe("Wallet configuration change");
	});

	it("shows raw address for unknown contract call", () => {
		const unknownContract = "0x3333333333333333333333333333333333333333";
		const result = decodeTransactionDescription(
			unknownContract,
			"0xdeadbeef1234",
			"0",
			WALLET,
		);
		expect(result).toContain("Contract call to");
		expect(result).toContain("3333...3333");
	});

	it("handles empty data as native transfer", () => {
		const result = decodeTransactionDescription(
			RECIPIENT,
			"0x",
			"1000000000000000000", // 1e18 wei = 1 native token
			WALLET,
		);
		expect(result).toContain("Transfer");
		expect(result).toContain("native");
		expect(result).toContain("2222...2222");
	});
});
