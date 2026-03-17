import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Sheet } from "./sheet";

afterEach(cleanup);

describe("Sheet", () => {
	it("renders nothing when closed", () => {
		render(
			<Sheet open={false} onClose={() => {}} title="Test">
				<p>Content</p>
			</Sheet>,
		);
		expect(screen.queryByText("Content")).not.toBeInTheDocument();
	});

	it("renders content when open", () => {
		render(
			<Sheet open={true} onClose={() => {}} title="Test Sheet">
				<p>Sheet content</p>
			</Sheet>,
		);
		expect(screen.getByText("Sheet content")).toBeInTheDocument();
	});

	it("renders title", () => {
		render(
			<Sheet open={true} onClose={() => {}} title="My Title">
				<p>Content</p>
			</Sheet>,
		);
		expect(screen.getByText("My Title")).toBeInTheDocument();
	});

	it("renders close button", () => {
		render(
			<Sheet open={true} onClose={() => {}} title="Test">
				<p>Content</p>
			</Sheet>,
		);
		expect(screen.getByLabelText("Close")).toBeInTheDocument();
	});

	it("calls onClose when close button clicked", () => {
		const onClose = vi.fn();
		render(
			<Sheet open={true} onClose={onClose} title="Test">
				<p>Content</p>
			</Sheet>,
		);
		fireEvent.click(screen.getByLabelText("Close"));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("calls onClose when overlay clicked", () => {
		const onClose = vi.fn();
		render(
			<Sheet open={true} onClose={onClose} title="Test">
				<p>Content</p>
			</Sheet>,
		);
		const overlay = screen.getByRole("dialog");
		fireEvent.click(overlay);
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("calls onClose when Escape key is pressed", () => {
		const onClose = vi.fn();
		render(
			<Sheet open={true} onClose={onClose} title="Test">
				<p>Content</p>
			</Sheet>,
		);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("restores body overflow when closed after being open", () => {
		const onClose = vi.fn();
		const { rerender } = render(
			<Sheet open={true} onClose={onClose} title="Test">
				<p>Content</p>
			</Sheet>,
		);
		expect(document.body.style.overflow).toBe("hidden");

		rerender(
			<Sheet open={false} onClose={onClose} title="Test">
				<p>Content</p>
			</Sheet>,
		);
		expect(document.body.style.overflow).toBe("");
	});

	it("renders without title", () => {
		render(
			<Sheet open={true} onClose={() => {}}>
				<p>No title content</p>
			</Sheet>,
		);
		expect(screen.getByText("No title content")).toBeInTheDocument();
		expect(screen.queryByRole("heading")).not.toBeInTheDocument();
	});
});
