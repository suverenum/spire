import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────

const mockAssertCanCreateAccount = vi.fn().mockResolvedValue({});
const mockFinalizeAccountCreate = vi.fn().mockResolvedValue({ account: { id: "acc-new" } });

vi.mock("../actions/create-account", () => ({
	assertCanCreateAccount: (...args: unknown[]) => mockAssertCanCreateAccount(...args),
	finalizeAccountCreate: (...args: unknown[]) => mockFinalizeAccountCreate(...args),
}));

const mockGeneratePrivateKey = vi
	.fn()
	.mockReturnValue("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
const mockPrivateKeyToAccount = vi.fn().mockReturnValue({
	address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
});

vi.mock("viem/accounts", () => ({
	generatePrivateKey: () => mockGeneratePrivateKey(),
	privateKeyToAccount: (...args: unknown[]) => mockPrivateKeyToAccount(...args),
}));

vi.mock("@/components/ui/toast", () => ({
	toast: vi.fn(),
}));

vi.mock("@/lib/constants", () => ({
	CACHE_KEYS: {
		accounts: (id: string) => ["accounts", id],
	},
}));

// ─── Helpers ────────────────────────────────────────────────────────

function createWrapper() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("useCreateAccount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAssertCanCreateAccount.mockResolvedValue({});
		mockFinalizeAccountCreate.mockResolvedValue({ account: { id: "acc-new" } });
		mockGeneratePrivateKey.mockReturnValue(
			"0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
		);
		mockPrivateKeyToAccount.mockReturnValue({
			address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		});
	});

	test("starts in idle step", async () => {
		const { useCreateAccount } = await import("./use-create-account");
		const { result } = renderHook(() => useCreateAccount(), { wrapper: createWrapper() });
		expect(result.current.step).toBe("idle");
	});

	test("successful creation generates real keypair and persists", async () => {
		const { useCreateAccount } = await import("./use-create-account");
		const { result } = renderHook(() => useCreateAccount(), { wrapper: createWrapper() });

		result.current.mutate({
			treasuryId: "t-1",
			tokenSymbol: "AlphaUSD",
			name: "New Account",
		});

		await waitFor(() => expect(result.current.step).toBe("complete"));

		// Verify keypair generation
		expect(mockGeneratePrivateKey).toHaveBeenCalledTimes(1);
		expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(
			"0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
		);

		// Verify finalize called with real address + private key
		expect(mockFinalizeAccountCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				walletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
				walletType: "smart-account",
				privateKey: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
				treasuryId: "t-1",
				tokenSymbol: "AlphaUSD",
				name: "New Account",
			}),
		);
	});

	test("transitions to error step when validation fails", async () => {
		mockAssertCanCreateAccount.mockResolvedValue({ error: "Name already taken" });

		const { useCreateAccount } = await import("./use-create-account");
		const { result } = renderHook(() => useCreateAccount(), { wrapper: createWrapper() });

		result.current.mutate({
			treasuryId: "t-1",
			tokenSymbol: "AlphaUSD",
			name: "Duplicate",
		});

		await waitFor(() => expect(result.current.step).toBe("error"));
		// Should not generate keypair or finalize when validation fails
		expect(mockGeneratePrivateKey).not.toHaveBeenCalled();
		expect(mockFinalizeAccountCreate).not.toHaveBeenCalled();
	});

	test("transitions to error step when finalize fails", async () => {
		mockFinalizeAccountCreate.mockResolvedValue({ error: "Wallet address already registered" });

		const { useCreateAccount } = await import("./use-create-account");
		const { result } = renderHook(() => useCreateAccount(), { wrapper: createWrapper() });

		result.current.mutate({
			treasuryId: "t-1",
			tokenSymbol: "AlphaUSD",
			name: "Account",
		});

		await waitFor(() => expect(result.current.step).toBe("error"));
		// Keypair was generated but persist failed
		expect(mockGeneratePrivateKey).toHaveBeenCalledTimes(1);
	});

	test("calls assertCanCreateAccount with correct params", async () => {
		const { useCreateAccount } = await import("./use-create-account");
		const { result } = renderHook(() => useCreateAccount(), { wrapper: createWrapper() });

		result.current.mutate({
			treasuryId: "t-1",
			tokenSymbol: "BetaUSD",
			name: "My Payroll",
		});

		await waitFor(() => expect(mockAssertCanCreateAccount).toHaveBeenCalled());
		expect(mockAssertCanCreateAccount).toHaveBeenCalledWith({
			treasuryId: "t-1",
			tokenSymbol: "BetaUSD",
			name: "My Payroll",
		});
	});
});
