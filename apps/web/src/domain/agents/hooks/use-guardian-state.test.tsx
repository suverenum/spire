import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReadContract = vi.fn();

vi.mock("viem", async () => {
	const actual = await vi.importActual<typeof import("viem")>("viem");

	return {
		...actual,
		createPublicClient: vi.fn(() => ({
			readContract: mockReadContract,
		})),
		http: vi.fn(),
	};
});

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe("useGuardianState", () => {
	beforeEach(() => {
		mockReadContract.mockReset();
		vi.resetModules();
	});

	it("reads proposal tuples that include reservedDay", async () => {
		const guardianAddress = "0x4444444444444444444444444444444444444444" as const;
		const tokenAddress = `0x${"11".repeat(20)}` as `0x${string}`;
		const recipient = "0x5555555555555555555555555555555555555555" as const;

		mockReadContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
			switch (functionName) {
				case "spentToday":
					return 2_000_000n;
				case "dailyLimit":
					return 10_000_000n;
				case "balanceOf":
					return 5_000_000n;
				case "proposalCount":
					return 1n;
				case "proposals":
					return [tokenAddress, recipient, 5_000_000n, 0, 1_700_000_000n, 19_675n] as const;
				default:
					throw new Error(`Unexpected function: ${functionName}`);
			}
		});

		const { GuardianOwnerAbi } = await import("../abis");
		const { useGuardianState } = await import("./use-guardian-state");
		const { result } = renderHook(() => useGuardianState(guardianAddress, tokenAddress), {
			wrapper: createWrapper(),
		});

		await waitFor(() =>
			expect(result.current.data).toEqual({
				spentToday: 2_000_000n,
				dailyLimit: 10_000_000n,
				balance: 5_000_000n,
				proposals: [
					{
						id: 1,
						token: tokenAddress,
						to: recipient,
						amount: 5_000_000n,
						status: 0,
						createdAt: 1_700_000_000n,
					},
				],
			}),
		);

		const proposalCall = mockReadContract.mock.calls.find(
			(call) => call[0]?.functionName === "proposals",
		)?.[0];
		const hookProposalAbi = proposalCall?.abi.find(
			(item: { type: string; name?: string; outputs?: Array<{ name?: string }> }) =>
				item.type === "function" && item.name === "proposals",
		);
		const ownerProposalAbi = GuardianOwnerAbi.find((item) => item.name === "proposals");

		expect(hookProposalAbi?.outputs).toHaveLength(6);
		expect(hookProposalAbi?.outputs?.[5]?.name).toBe("reservedDay");
		expect(ownerProposalAbi?.outputs).toHaveLength(6);
		expect(ownerProposalAbi?.outputs?.[5]?.name).toBe("reservedDay");
	});
});
