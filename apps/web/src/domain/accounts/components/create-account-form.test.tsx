import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateAccountForm } from "./create-account-form";

vi.mock("../hooks/use-create-account", () => ({
	CREATE_ACCOUNT_UNAVAILABLE_ERROR: "Additional cash accounts are temporarily unavailable",
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("CreateAccountForm", () => {
	it("renders the availability notice", () => {
		render(<CreateAccountForm open onClose={vi.fn()} treasuryId="t-1" />);
		expect(
			screen.getByText(/additional cash accounts are temporarily unavailable/i),
		).toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(2);
	});

	it("closes the sheet", async () => {
		const onClose = vi.fn();
		render(<CreateAccountForm open onClose={onClose} treasuryId="t-1" />);
		await userEvent.click(screen.getAllByRole("button", { name: "Close" })[1]);
		expect(onClose).toHaveBeenCalled();
	});
});
