import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocketBanner } from "./websocket-banner";

afterEach(cleanup);

describe("WebSocketBanner", () => {
	it("always shows updated timestamp", () => {
		render(<WebSocketBanner isConnected={true} />);
		expect(screen.getByText(/Updated at/)).toBeInTheDocument();
	});

	it("shows updated timestamp when disconnected", () => {
		render(<WebSocketBanner isConnected={false} />);
		expect(screen.getByText(/Updated at/)).toBeInTheDocument();
	});
});
