import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MultisigBadge } from "./multisig-badge";

afterEach(cleanup);

describe("MultisigBadge", () => {
	it("renders multisig badge with owner count", () => {
		render(<MultisigBadge ownerCount={5} />);
		expect(screen.getByTestId("multisig-badge")).toHaveTextContent(
			"Multisig 5",
		);
	});

	it("does not render pending badge when count is zero", () => {
		render(<MultisigBadge ownerCount={3} pendingCount={0} />);
		expect(screen.queryByTestId("pending-badge")).not.toBeInTheDocument();
	});

	it("does not render pending badge when not provided", () => {
		render(<MultisigBadge ownerCount={3} />);
		expect(screen.queryByTestId("pending-badge")).not.toBeInTheDocument();
	});

	it("renders pending badge when count is positive", () => {
		render(<MultisigBadge ownerCount={3} pendingCount={2} />);
		expect(screen.getByTestId("pending-badge")).toHaveTextContent("2 pending");
	});
});
