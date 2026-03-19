import { SUPPORTED_TOKENS } from "@/lib/constants";
import { truncateAddress } from "@/lib/utils";

const TRANSFER_SELECTOR = "0xa9059cbb";
const APPROVE_SELECTOR = "0x095ea7b3";
const ADD_OWNER_SELECTOR = "0x7065cb48";
const REMOVE_OWNER_SELECTOR = "0x173825d9";

function findTokenName(address: string): string | null {
	const normalized = address.toLowerCase();
	for (const token of Object.values(SUPPORTED_TOKENS)) {
		if (token.address.toLowerCase() === normalized) {
			return token.name;
		}
	}
	return null;
}

function formatAmount(amountHex: string, decimals = 6): string {
	try {
		const amount = BigInt(`0x${amountHex}`);
		const whole = amount / BigInt(10 ** decimals);
		const frac = amount % BigInt(10 ** decimals);
		if (frac === 0n) return `$${whole.toLocaleString()}`;
		return `$${whole.toLocaleString()}.${frac.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
	} catch {
		return "unknown amount";
	}
}

function decodeAddress(hex: string): string {
	// ABI-encoded address is 32 bytes, address in last 20 bytes
	return `0x${hex.slice(24)}`;
}

/**
 * Decode a multisig transaction into a human-readable description.
 */
export function decodeTransactionDescription(
	to: string,
	data: string,
	value: string,
	walletAddress: string,
): string {
	// Self-call to multisig (owner management, threshold changes)
	if (to.toLowerCase() === walletAddress.toLowerCase()) {
		if (data.length >= 10) {
			const selector = data.slice(0, 10).toLowerCase();
			if (selector === ADD_OWNER_SELECTOR && data.length >= 74) {
				const owner = decodeAddress(data.slice(10, 74));
				return `Add signer ${truncateAddress(owner)}`;
			}
			if (selector === REMOVE_OWNER_SELECTOR && data.length >= 74) {
				const owner = decodeAddress(data.slice(10, 74));
				return `Remove signer ${truncateAddress(owner)}`;
			}
			return "Wallet configuration change";
		}
		return "Self-call";
	}

	// ERC20 transfer
	const tokenName = findTokenName(to);
	if (data.length >= 138) {
		const selector = data.slice(0, 10).toLowerCase();
		if (selector === TRANSFER_SELECTOR) {
			const recipient = decodeAddress(data.slice(10, 74));
			const amount = data.slice(74, 138);
			const label = tokenName ?? truncateAddress(to);
			return `Transfer ${formatAmount(amount)} ${label} to ${truncateAddress(recipient)}`;
		}
		if (selector === APPROVE_SELECTOR) {
			const spender = decodeAddress(data.slice(10, 74));
			const amount = data.slice(74, 138);
			const label = tokenName ?? truncateAddress(to);
			return `Approve ${formatAmount(amount)} ${label} for ${truncateAddress(spender)}`;
		}
	}

	// Native value transfer (18 decimals, not dollar-denominated)
	if (data === "0x" || data.length <= 2) {
		const val = BigInt(value);
		if (val > 0n) {
			const whole = val / 10n ** 18n;
			const frac = val % 10n ** 18n;
			const formatted =
				frac === 0n
					? whole.toString()
					: `${whole}.${frac.toString().padStart(18, "0").replace(/0+$/, "")}`;
			return `Transfer ${formatted} native to ${truncateAddress(to)}`;
		}
	}

	// Guard configuration call
	// (to = guard address, not multisig or token)
	if (data.length >= 10) {
		return `Contract call to ${truncateAddress(to)}`;
	}

	return `Transaction to ${truncateAddress(to)}`;
}
