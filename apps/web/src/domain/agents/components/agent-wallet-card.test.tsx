import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentWalletData } from "../queries/get-agents";
import { AgentWalletCard } from "./agent-wallet-card";

vi.mock("next/link", () => ({
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
}));

vi.mock("../hooks/use-guardian-state", () => ({
	useGuardianState: vi.fn(() => ({
		data: {
			spentToday: 2000000n,
			dailyLimit: 10000000n,
			balance: 5000000n,
			proposals: [],
		},
	})),
}));

vi.mock("./reveal-key-dialog", () => ({
	RevealKeyDialog: ({ onClose }: { onClose: () => void }) => (
		<div data-testid="mock-reveal-dialog">
			<button type="button" onClick={onClose}>
				Close
			</button>
		</div>
	),
}));

afterEach(cleanup);

function makeWalletData(overrides: Partial<AgentWalletData> = {}): AgentWalletData {
	return {
		id: "w-1",
		accountId: "acc-1",
		label: "Marketing Bot",
		guardianAddress: "0x4444444444444444444444444444444444444444",
		agentKeyAddress: "0x3333333333333333333333333333333333333333",
		spendingCap: "50000000",
		dailyLimit: "10000000",
		maxPerTx: "2000000",
		allowedVendors: ["0x0000000000000000000000000000000000000001"],
		status: "active",
		tokenSymbol: "AlphaUSD",
		tokenAddress: "0x20c0000000000000000000000000000000000001",
		deployedAt: "2025-06-01T00:00:00.000Z",
		...overrides,
	};
}

describe("AgentWalletCard", () => {
	it("renders wallet label and truncated address", () => {
		render(<AgentWalletCard wallet={makeWalletData()} onRevoke={vi.fn()} />);
		expect(screen.getByText("Marketing Bot")).toBeInTheDocument();
		expect(screen.getByText("0x4444...4444")).toBeInTheDocument();
	});

	it("shows active status badge", () => {
		render(<AgentWalletCard wallet={makeWalletData()} onRevoke={vi.fn()} />);
		expect(screen.getByTestId("agent-status-badge")).toHaveTextContent("active");
	});

	it("shows revoked status badge", () => {
		render(<AgentWalletCard wallet={makeWalletData({ status: "revoked" })} onRevoke={vi.fn()} />);
		expect(screen.getByTestId("agent-status-badge")).toHaveTextContent("revoked");
	});

	it("displays spending limits", () => {
		render(<AgentWalletCard wallet={makeWalletData()} onRevoke={vi.fn()} />);
		expect(screen.getByText("Per-tx cap")).toBeInTheDocument();
		expect(screen.getByText("Daily limit")).toBeInTheDocument();
		expect(screen.getByText("Total cap")).toBeInTheDocument();
	});

	it("displays spending progress from on-chain state", () => {
		render(<AgentWalletCard wallet={makeWalletData()} onRevoke={vi.fn()} />);
		expect(screen.getByTestId("spending-progress")).toBeInTheDocument();
	});

	it("calls onRevoke with wallet ID when revoke button clicked", () => {
		const mockRevoke = vi.fn();
		render(<AgentWalletCard wallet={makeWalletData()} onRevoke={mockRevoke} />);
		fireEvent.click(screen.getByTestId("revoke-btn"));
		expect(mockRevoke).toHaveBeenCalledWith("w-1");
	});

	it("disables buttons when wallet is revoked", () => {
		render(<AgentWalletCard wallet={makeWalletData({ status: "revoked" })} onRevoke={vi.fn()} />);
		expect(screen.getByTestId("reveal-key-btn")).toBeDisabled();
		expect(screen.getByTestId("revoke-btn")).toBeDisabled();
	});

	it("opens reveal key dialog when reveal button clicked", () => {
		render(<AgentWalletCard wallet={makeWalletData()} onRevoke={vi.fn()} />);
		fireEvent.click(screen.getByTestId("reveal-key-btn"));
		expect(screen.getByTestId("mock-reveal-dialog")).toBeInTheDocument();
	});

	it("links to agent detail page", () => {
		render(<AgentWalletCard wallet={makeWalletData()} onRevoke={vi.fn()} />);
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/agents/acc-1");
	});
});
