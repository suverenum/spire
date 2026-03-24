import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────

const mockToast = vi.fn();

vi.mock("@/components/ui/toast", () => ({
	toast: (...args: unknown[]) => mockToast(...args),
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
	});

	test("starts in idle step", async () => {
		const { useCreateAccount } = await import("./use-create-account");
		const { result } = renderHook(() => useCreateAccount(), { wrapper: createWrapper() });
		expect(result.current.step).toBe("idle");
	});

	test("immediately rejects additional cash account creation", async () => {
		const { CREATE_ACCOUNT_UNAVAILABLE_ERROR, useCreateAccount } = await import(
			"./use-create-account"
		);
		const { result } = renderHook(() => useCreateAccount(), { wrapper: createWrapper() });

		result.current.mutate({
			treasuryId: "t-1",
			tokenSymbol: "AlphaUSD",
			name: "New Account",
		});

		await waitFor(() => expect(result.current.step).toBe("error"));
		expect(mockToast).toHaveBeenCalledWith(CREATE_ACCOUNT_UNAVAILABLE_ERROR, "error");
	});

	test("resets back to idle after showing the gated error", async () => {
		vi.useFakeTimers();
		const { useCreateAccount } = await import("./use-create-account");
		const { result } = renderHook(() => useCreateAccount(), { wrapper: createWrapper() });

		try {
			act(() => {
				result.current.mutate({
					treasuryId: "t-1",
					tokenSymbol: "AlphaUSD",
					name: "Account",
				});
			});

			await act(async () => {
				await Promise.resolve();
			});

			expect(result.current.step).toBe("error");

			await act(async () => {
				await vi.advanceTimersByTimeAsync(2000);
			});

			expect(result.current.step).toBe("idle");
		} finally {
			vi.useRealTimers();
		}
	});
});
