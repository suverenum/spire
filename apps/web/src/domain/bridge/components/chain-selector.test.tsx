import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChainSelector } from "./chain-selector";

afterEach(cleanup);

describe("ChainSelector", () => {
	it("renders all three chain options", () => {
		render(<ChainSelector value="tempo" onChange={vi.fn()} enableExternalChains={true} />);
		const select = screen.getByLabelText("Source Network");
		const options = select.querySelectorAll("option");
		expect(options).toHaveLength(3);
		expect(options[0].textContent).toContain("Tempo");
		expect(options[1].textContent).toContain("Ethereum");
		expect(options[2].textContent).toContain("Solana");
	});

	it("shows Tempo badge", () => {
		render(<ChainSelector value="tempo" onChange={vi.fn()} enableExternalChains={true} />);
		const select = screen.getByLabelText("Source Network");
		const tempoOption = select.querySelector("option[value='tempo']");
		expect(tempoOption?.textContent).toContain("Free");
		expect(tempoOption?.textContent).toContain("Instant");
	});

	it("disables Ethereum and Solana when enableExternalChains is false", () => {
		render(<ChainSelector value="tempo" onChange={vi.fn()} enableExternalChains={false} />);
		const select = screen.getByLabelText("Source Network");
		const ethOption = select.querySelector("option[value='ethereum']") as HTMLOptionElement;
		const solOption = select.querySelector("option[value='solana']") as HTMLOptionElement;
		expect(ethOption.disabled).toBe(true);
		expect(solOption.disabled).toBe(true);
	});

	it("enables Ethereum and Solana when enableExternalChains is true", () => {
		render(<ChainSelector value="tempo" onChange={vi.fn()} enableExternalChains={true} />);
		const select = screen.getByLabelText("Source Network");
		const ethOption = select.querySelector("option[value='ethereum']") as HTMLOptionElement;
		const solOption = select.querySelector("option[value='solana']") as HTMLOptionElement;
		expect(ethOption.disabled).toBe(false);
		expect(solOption.disabled).toBe(false);
	});

	it("shows USDC-only helper text when external chains are disabled", () => {
		render(<ChainSelector value="tempo" onChange={vi.fn()} enableExternalChains={false} />);
		expect(
			screen.getByText("Cross-chain deposits are available for USDC accounts only."),
		).toBeInTheDocument();
	});

	it("hides helper text when external chains are enabled", () => {
		render(<ChainSelector value="tempo" onChange={vi.fn()} enableExternalChains={true} />);
		expect(
			screen.queryByText("Cross-chain deposits are available for USDC accounts only."),
		).not.toBeInTheDocument();
	});

	it("calls onChange when a chain is selected", () => {
		const onChange = vi.fn();
		render(<ChainSelector value="tempo" onChange={onChange} enableExternalChains={true} />);
		fireEvent.change(screen.getByLabelText("Source Network"), {
			target: { value: "ethereum" },
		});
		expect(onChange).toHaveBeenCalledWith("ethereum");
	});

	it("shows disabled label in option text when external chains disabled", () => {
		render(<ChainSelector value="tempo" onChange={vi.fn()} enableExternalChains={false} />);
		const select = screen.getByLabelText("Source Network");
		const ethOption = select.querySelector("option[value='ethereum']");
		expect(ethOption?.textContent).toContain("USDC accounts only");
	});
});
