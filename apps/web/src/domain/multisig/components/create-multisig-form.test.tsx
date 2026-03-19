import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateMultisigForm } from "./create-multisig-form";

vi.mock("viem/accounts", () => ({
	generatePrivateKey: () => "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
	privateKeyToAddress: () => "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
}));

const mockMutate = vi.fn();
vi.mock("../hooks/use-create-multisig", () => ({
	useCreateMultisig: () => ({
		mutate: mockMutate,
		isPending: false,
	}),
}));

function renderWithQuery(ui: React.ReactElement) {
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const ADMIN = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

afterEach(cleanup);

beforeEach(() => {
	vi.clearAllMocks();
});

describe("CreateMultisigForm", () => {
	it("renders form fields when open", () => {
		renderWithQuery(
			<CreateMultisigForm open={true} onClose={vi.fn()} treasuryId="t1" adminAddress={ADMIN} />,
		);
		expect(screen.getByLabelText("Account Name")).toBeInTheDocument();
		expect(screen.getByText(/Token:/)).toBeInTheDocument();
		expect(screen.getByText(/you\)/)).toBeInTheDocument();
		expect(screen.getByText("Auto-generated agent key")).toBeInTheDocument();
	});

	it("shows admin address as first signer", () => {
		renderWithQuery(
			<CreateMultisigForm open={true} onClose={vi.fn()} treasuryId="t1" adminAddress={ADMIN} />,
		);
		expect(screen.getByText(/0xf39F.*2266 \(you\)/)).toBeInTheDocument();
	});

	it("validates empty name", () => {
		renderWithQuery(
			<CreateMultisigForm open={true} onClose={vi.fn()} treasuryId="t1" adminAddress={ADMIN} />,
		);
		fireEvent.click(screen.getByRole("button", { name: /Create Agent Account/ }));
		expect(screen.getByText("Account name is required")).toBeInTheDocument();
	});

	it("validates long name", () => {
		renderWithQuery(
			<CreateMultisigForm open={true} onClose={vi.fn()} treasuryId="t1" adminAddress={ADMIN} />,
		);
		fireEvent.change(screen.getByLabelText("Account Name"), {
			target: { value: "a".repeat(101) },
		});
		fireEvent.click(screen.getByRole("button", { name: /Create Agent Account/ }));
		expect(screen.getByText("Account name must be 100 characters or less")).toBeInTheDocument();
	});

	it("calls mutate with correct params on valid submit", () => {
		renderWithQuery(
			<CreateMultisigForm open={true} onClose={vi.fn()} treasuryId="t1" adminAddress={ADMIN} />,
		);

		fireEvent.change(screen.getByLabelText("Account Name"), {
			target: { value: "Operations" },
		});
		fireEvent.click(screen.getByRole("button", { name: /Create Agent Account/ }));

		expect(mockMutate).toHaveBeenCalledWith(
			expect.objectContaining({
				treasuryId: "t1",
				name: "Operations",
				tokenSymbol: "AlphaUSD",
				owners: [ADMIN, "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"],
				defaultConfirmations: 2,
				agentPrivateKey: expect.stringMatching(/^0x/),
				agentAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
			}),
			expect.any(Object),
		);
	});

	it("renders nothing when closed", () => {
		const { container } = renderWithQuery(
			<CreateMultisigForm open={false} onClose={vi.fn()} treasuryId="t1" adminAddress={ADMIN} />,
		);
		expect(container.querySelector("form")).toBeNull();
	});
});
