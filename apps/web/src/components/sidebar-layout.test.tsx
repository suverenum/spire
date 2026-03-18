import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarLayout } from "./sidebar-layout";

vi.mock("./sidebar", () => ({
	Sidebar: ({ treasuryName }: { treasuryName: string }) => (
		<div data-testid="sidebar">{treasuryName}</div>
	),
}));

afterEach(cleanup);

describe("SidebarLayout", () => {
	it("renders sidebar with treasury name", () => {
		render(
			<SidebarLayout treasuryName="My Treasury">
				<div>Content</div>
			</SidebarLayout>,
		);
		expect(screen.getByTestId("sidebar")).toHaveTextContent("My Treasury");
	});

	it("renders children in main area", () => {
		render(
			<SidebarLayout treasuryName="Test">
				<div>Page Content</div>
			</SidebarLayout>,
		);
		expect(screen.getByText("Page Content")).toBeInTheDocument();
	});

	it("wraps content in layout structure", () => {
		const { container } = render(
			<SidebarLayout treasuryName="Test">
				<div>Content</div>
			</SidebarLayout>,
		);
		expect(container.querySelector("main")).toBeInTheDocument();
		expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
	});
});
