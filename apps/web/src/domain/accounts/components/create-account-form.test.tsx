import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateAccountForm } from "./create-account-form";

const mockMutate = vi.fn();

vi.mock("../hooks/use-create-account", () => ({
	useCreateAccount: () => ({
		mutate: mockMutate,
		isPending: false,
	}),
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("CreateAccountForm", () => {
	it("renders form fields when open", () => {
		render(<CreateAccountForm open onClose={vi.fn()} treasuryId="t-1" />);
		expect(screen.getByLabelText("Account Name")).toBeInTheDocument();
		expect(screen.getByText(/Token:\s*AlphaUSD/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
	});

	it("shows error when name is empty", async () => {
		render(<CreateAccountForm open onClose={vi.fn()} treasuryId="t-1" />);
		await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
		expect(screen.getByText("Account name is required")).toBeInTheDocument();
		expect(mockMutate).not.toHaveBeenCalled();
	});

	it("shows error when name is too long", async () => {
		render(<CreateAccountForm open onClose={vi.fn()} treasuryId="t-1" />);
		const input = screen.getByLabelText("Account Name");
		await userEvent.type(input, "a".repeat(101));
		await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
		expect(screen.getByText("Account name must be 100 characters or less")).toBeInTheDocument();
		expect(mockMutate).not.toHaveBeenCalled();
	});

	it("calls mutate with correct params on valid submit", async () => {
		render(<CreateAccountForm open onClose={vi.fn()} treasuryId="t-1" />);
		await userEvent.type(screen.getByLabelText("Account Name"), "My Account");
		await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
		expect(mockMutate).toHaveBeenCalledWith(
			{ treasuryId: "t-1", tokenSymbol: "AlphaUSD", name: "My Account" },
			expect.objectContaining({
				onSuccess: expect.any(Function),
				onError: expect.any(Function),
			}),
		);
	});

	it("calls onClose on success callback", async () => {
		mockMutate.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
			opts.onSuccess?.();
		});
		const onClose = vi.fn();
		render(<CreateAccountForm open onClose={onClose} treasuryId="t-1" />);
		await userEvent.type(screen.getByLabelText("Account Name"), "Test");
		await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
		expect(onClose).toHaveBeenCalled();
	});

	it("shows error from mutation onError callback", async () => {
		mockMutate.mockImplementation((_data: unknown, opts: { onError?: (err: Error) => void }) => {
			opts.onError?.(new Error("Name already taken"));
		});
		render(<CreateAccountForm open onClose={vi.fn()} treasuryId="t-1" />);
		await userEvent.type(screen.getByLabelText("Account Name"), "Test");
		await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
		expect(screen.getByText("Name already taken")).toBeInTheDocument();
	});

	it("shows token as plain text when only one option", () => {
		render(<CreateAccountForm open onClose={vi.fn()} treasuryId="t-1" />);
		expect(screen.getByText(/Token:\s*AlphaUSD/)).toBeInTheDocument();
		expect(screen.queryByLabelText("Token")).not.toBeInTheDocument();
	});
});
