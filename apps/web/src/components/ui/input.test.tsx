import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Input } from "./input";

afterEach(cleanup);

describe("Input", () => {
	it("renders an input element", () => {
		render(<Input placeholder="Enter text" />);
		expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
	});

	it("passes type prop", () => {
		render(<Input type="email" placeholder="Email" />);
		expect(screen.getByPlaceholderText("Email")).toHaveAttribute("type", "email");
	});

	it("applies custom className", () => {
		render(<Input className="custom" placeholder="test" />);
		expect(screen.getByPlaceholderText("test").className).toContain("custom");
	});

	it("renders disabled state", () => {
		render(<Input disabled placeholder="disabled" />);
		expect(screen.getByPlaceholderText("disabled")).toBeDisabled();
	});
});
