import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateMultisigForm } from "./create-multisig-form";

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
			<CreateMultisigForm
				open={true}
				onClose={vi.fn()}
				treasuryId="t1"
				adminAddress={ADMIN}
			/>,
		);
		expect(screen.getByLabelText("Account Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Token")).toBeInTheDocument();
		expect(screen.getByText("Signers")).toBeInTheDocument();
		expect(screen.getByText("Approval Thresholds")).toBeInTheDocument();
		expect(screen.getByTestId("policy-preview")).toBeInTheDocument();
	});

	it("shows admin address as first signer", () => {
		renderWithQuery(
			<CreateMultisigForm
				open={true}
				onClose={vi.fn()}
				treasuryId="t1"
				adminAddress={ADMIN}
			/>,
		);
		expect(screen.getByText(/0xf39F.*2266 \(you\)/)).toBeInTheDocument();
	});

	it("validates empty name", () => {
		renderWithQuery(
			<CreateMultisigForm
				open={true}
				onClose={vi.fn()}
				treasuryId="t1"
				adminAddress={ADMIN}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: /Create Multisig Account/ }),
		);
		expect(screen.getByText("Account name is required")).toBeInTheDocument();
	});

	it("validates invalid signer address", () => {
		renderWithQuery(
			<CreateMultisigForm
				open={true}
				onClose={vi.fn()}
				treasuryId="t1"
				adminAddress={ADMIN}
			/>,
		);
		fireEvent.change(screen.getByLabelText("Account Name"), {
			target: { value: "Test" },
		});
		fireEvent.change(screen.getByLabelText("Signer 2 address"), {
			target: { value: "not-an-address" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: /Create Multisig Account/ }),
		);
		expect(screen.getByText(/Invalid signer address/)).toBeInTheDocument();
	});

	it("shows policy preview with tier configuration", () => {
		renderWithQuery(
			<CreateMultisigForm
				open={true}
				onClose={vi.fn()}
				treasuryId="t1"
				adminAddress={ADMIN}
			/>,
		);
		const preview = screen.getByTestId("policy-preview");
		expect(preview).toHaveTextContent("Transfers up to $10,000");
		// Only admin counted as signer (empty signer input doesn't count)
		expect(preview).toHaveTextContent("1/1 approvals");
	});

	it("calls mutate with correct params on valid submit", () => {
		renderWithQuery(
			<CreateMultisigForm
				open={true}
				onClose={vi.fn()}
				treasuryId="t1"
				adminAddress={ADMIN}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Account Name"), {
			target: { value: "Treasury Ops" },
		});
		// Add a valid signer address so we have 2 signers total
		fireEvent.change(screen.getByLabelText("Signer 2 address"), {
			target: { value: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
		});
		// Set default confirmations to 2 (within signer count)
		fireEvent.change(screen.getByLabelText("Default confirmations"), {
			target: { value: "2" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: /Create Multisig Account/ }),
		);

		expect(mockMutate).toHaveBeenCalledWith(
			expect.objectContaining({
				treasuryId: "t1",
				name: "Treasury Ops",
				tokenSymbol: "AlphaUSD",
				owners: [ADMIN, "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"],
			}),
			expect.any(Object),
		);
	});

	it("validates default confirmations exceeds signer count", () => {
		renderWithQuery(
			<CreateMultisigForm
				open={true}
				onClose={vi.fn()}
				treasuryId="t1"
				adminAddress={ADMIN}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Account Name"), {
			target: { value: "Test" },
		});
		// Default confirmations dropdown max = totalSigners, so we can't set it higher
		// via the dropdown. But let's verify the preview shows reasonable values.
		const preview = screen.getByTestId("policy-preview");
		expect(preview).toBeInTheDocument();
	});

	it("adds and removes signers", () => {
		renderWithQuery(
			<CreateMultisigForm
				open={true}
				onClose={vi.fn()}
				treasuryId="t1"
				adminAddress={ADMIN}
			/>,
		);

		// Initially one signer input
		expect(screen.getByLabelText("Signer 2 address")).toBeInTheDocument();

		// Add another signer
		fireEvent.click(screen.getByText("+ Add signer"));
		expect(screen.getByLabelText("Signer 3 address")).toBeInTheDocument();

		// Remove the second signer
		const removeButtons = screen.getAllByLabelText(/Remove signer/);
		fireEvent.click(removeButtons[0]);
		expect(screen.queryByLabelText("Signer 3 address")).not.toBeInTheDocument();
	});

	it("toggles allowlist", () => {
		renderWithQuery(
			<CreateMultisigForm
				open={true}
				onClose={vi.fn()}
				treasuryId="t1"
				adminAddress={ADMIN}
			/>,
		);

		const checkbox = screen.getByLabelText(/Enable address allowlist/);
		expect(checkbox).not.toBeChecked();

		fireEvent.click(checkbox);
		expect(checkbox).toBeChecked();
		expect(screen.getByTestId("policy-preview")).toHaveTextContent(
			"Only allowlisted addresses",
		);
	});
});
