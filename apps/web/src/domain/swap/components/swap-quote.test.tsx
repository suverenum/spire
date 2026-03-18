import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SwapQuoteDisplay } from "./swap-quote";

afterEach(cleanup);

describe("SwapQuoteDisplay", () => {
	it("shows loading state", () => {
		render(
			<SwapQuoteDisplay
				amountOut={0n}
				tokenOut="BetaUSD"
				rate={0}
				slippage={0}
				minAmountOut={0n}
				isLoading
			/>,
		);
		expect(screen.getByText("Fetching quote...")).toBeInTheDocument();
	});

	it("displays quote details", () => {
		render(
			<SwapQuoteDisplay
				amountOut={999000n}
				tokenOut="BetaUSD"
				rate={0.999}
				slippage={0.005}
				minAmountOut={994005n}
				isLoading={false}
			/>,
		);
		expect(screen.getByText("You receive")).toBeInTheDocument();
		expect(screen.getByText(/\$0.99.*BetaUSD/)).toBeInTheDocument();
		expect(screen.getByText("0.9990")).toBeInTheDocument();
		expect(screen.getByText("0.5%")).toBeInTheDocument();
		expect(screen.getByText("Min received")).toBeInTheDocument();
	});

	it("formats rate with 4 decimal places", () => {
		render(
			<SwapQuoteDisplay
				amountOut={1000000n}
				tokenOut="BetaUSD"
				rate={1.0}
				slippage={0.001}
				minAmountOut={999000n}
				isLoading={false}
			/>,
		);
		expect(screen.getByText("1.0000")).toBeInTheDocument();
	});
});
