/**
 * Hardcoded vendor registry for Agent Bank.
 * Maps known AI service providers to their MPP recipient addresses on Tempo.
 * These are placeholder addresses for hackathon — will be replaced with real vendor addresses.
 */

export interface Vendor {
	id: string;
	name: string;
	domain: string;
	address: `0x${string}`;
	description: string;
}

export const VENDORS: Record<string, Vendor> = {
	openai: {
		id: "openai",
		name: "OpenAI",
		domain: "openai.com",
		address: "0x0000000000000000000000000000000000000001",
		description: "GPT-4, DALL·E, Whisper",
	},
	anthropic: {
		id: "anthropic",
		name: "Anthropic",
		domain: "anthropic.com",
		address: "0x0000000000000000000000000000000000000002",
		description: "Claude API",
	},
	stability: {
		id: "stability",
		name: "Stability AI",
		domain: "stability.ai",
		address: "0x0000000000000000000000000000000000000003",
		description: "Stable Diffusion",
	},
	fal: {
		id: "fal",
		name: "fal.ai",
		domain: "fal.ai",
		address: "0x0000000000000000000000000000000000000004",
		description: "Fast ML inference (Flux, SDXL)",
	},
	perplexity: {
		id: "perplexity",
		name: "Perplexity",
		domain: "perplexity.ai",
		address: "0x0000000000000000000000000000000000000005",
		description: "AI search",
	},
} as const;

export const VENDOR_LIST = Object.values(VENDORS);

/** Get vendor by recipient address (case-insensitive) */
export function getVendorByAddress(address: string): Vendor | undefined {
	return VENDOR_LIST.find((v) => v.address.toLowerCase() === address.toLowerCase());
}
