import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Card, CardHeader, CardTitle } from "./card";

afterEach(cleanup);

describe("Card", () => {
	it("renders card with children", () => {
		render(<Card>Card content</Card>);
		expect(screen.getByText("Card content")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		render(<Card className="my-custom">Content</Card>);
		expect(screen.getByText("Content").className).toContain("my-custom");
	});
});

describe("CardHeader", () => {
	it("renders header", () => {
		render(<CardHeader>Header</CardHeader>);
		expect(screen.getByText("Header")).toBeInTheDocument();
	});
});

describe("CardTitle", () => {
	it("renders title as heading", () => {
		render(<CardTitle>Title</CardTitle>);
		expect(screen.getByText("Title").tagName).toBe("H3");
	});
});
