import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Home from "./page";

afterEach(() => {
  cleanup();
});

describe("Home page", () => {
  it("renders the Spire heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Spire" })).toBeInTheDocument();
  });

  it("renders the description text", () => {
    render(<Home />);
    expect(
      screen.getByText("Treasury management on Tempo blockchain"),
    ).toBeInTheDocument();
  });
});
