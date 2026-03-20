import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentBankLanding } from "./landing-page";

vi.mock("@/lib/vendors", () => ({
	VENDOR_LIST: [
		{ name: "Stability AI", address: "0x0000000000000000000000000000000000000001" },
		{ name: "OpenAI", address: "0x0000000000000000000000000000000000000002" },
	],
}));

vi.mock("../utils/code-snippet", () => ({
	AGENT_CODE_SNIPPET: "const agent = new Agent();",
}));

afterEach(cleanup);

describe("AgentBankLanding", () => {
	it("renders hero section with title", () => {
		render(<AgentBankLanding onGetStarted={vi.fn()} />);
		expect(screen.getByText("Bank for your AI Agents")).toBeInTheDocument();
	});

	it("calls onGetStarted when CTA clicked", () => {
		const mockGetStarted = vi.fn();
		render(<AgentBankLanding onGetStarted={mockGetStarted} />);
		fireEvent.click(screen.getByTestId("hero-cta"));
		expect(mockGetStarted).toHaveBeenCalled();
	});

	it("displays vendor list", () => {
		render(<AgentBankLanding onGetStarted={vi.fn()} />);
		expect(screen.getByText("Stability AI")).toBeInTheDocument();
		expect(screen.getByText("OpenAI")).toBeInTheDocument();
	});

	it("renders key features", () => {
		render(<AgentBankLanding onGetStarted={vi.fn()} />);
		expect(screen.getByText(/spending limits/i)).toBeInTheDocument();
	});
});
