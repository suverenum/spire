import { vi } from "vitest";

/**
 * Shared mock data for test files.
 *
 * IMPORTANT: vi.mock() is hoisted by vitest — it CANNOT be called from
 * imported functions. Instead, import these mock data objects and use them
 * inside your own vi.mock() calls.
 *
 * Example:
 *   import { DEFAULT_SESSION } from "@/test/mocks";
 *   vi.mock("@/lib/session", () => ({
 *     getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
 *   }));
 */

// ─── Session Mock Data ──────────────────────────────────────────────

export const DEFAULT_SESSION = {
	treasuryId: "test-treasury-id",
	tempoAddress: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
	treasuryName: "Test Treasury",
	authenticatedAt: Date.now(),
	organizationId: "test-org-id",
	organizationName: "Test Organization",
};

export function makeSession(overrides: Partial<typeof DEFAULT_SESSION> = {}) {
	return { ...DEFAULT_SESSION, ...overrides };
}

// ─── Router Mock Data ───────────────────────────────────────────────

export function createMockRouter() {
	return {
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
	};
}

// ─── Next Link Mock Factory ─────────────────────────────────────────

/**
 * Use inside vi.mock("next/link", () => mockNextLink())
 */
export function mockNextLink() {
	return {
		default: ({
			href,
			children,
			...props
		}: {
			href: string;
			children: React.ReactNode;
			[key: string]: unknown;
		}) => (
			<a href={href} {...props}>
				{children}
			</a>
		),
	};
}
