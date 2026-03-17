import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
} from "@testing-library/react";
import { LockScreen } from "./lock-screen";

const mockLoginAction = vi.fn();

vi.mock("../actions/auth-actions", () => ({
  loginAction: (...args: unknown[]) => mockLoginAction(...args),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("LockScreen", () => {
  beforeEach(() => {
    mockLoginAction.mockReset();
    mockLoginAction.mockResolvedValue({});
  });

  it("renders treasury name", () => {
    render(<LockScreen treasuryId="123" treasuryName="My Treasury" />);
    expect(screen.getByText("My Treasury")).toBeInTheDocument();
  });

  it("shows passkey prompt text", () => {
    render(<LockScreen treasuryId="123" treasuryName="Test" />);
    expect(
      screen.getByText("Authenticate with your passkey to continue"),
    ).toBeInTheDocument();
  });

  it("renders unlock button", () => {
    render(<LockScreen treasuryId="123" treasuryName="Test" />);
    expect(
      screen.getByRole("button", { name: /Unlock with Passkey/ }),
    ).toBeInTheDocument();
  });

  it("calls loginAction on button click", async () => {
    mockLoginAction.mockResolvedValue({});
    render(<LockScreen treasuryId="123" treasuryName="Test" />);
    const button = screen.getByRole("button", { name: /Unlock with Passkey/ });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockLoginAction).toHaveBeenCalledWith("123");
  });

  it("shows error message when loginAction returns error", async () => {
    mockLoginAction.mockResolvedValue({ error: "Authentication failed" });
    render(<LockScreen treasuryId="123" treasuryName="Test" />);
    const button = screen.getByRole("button", { name: /Unlock with Passkey/ });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Authentication failed",
    );
  });

  it("does not show error when loginAction returns no error", async () => {
    mockLoginAction.mockResolvedValue({});
    render(<LockScreen treasuryId="123" treasuryName="Test" />);
    const button = screen.getByRole("button", { name: /Unlock with Passkey/ });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears previous error on new unlock attempt", async () => {
    mockLoginAction
      .mockResolvedValueOnce({ error: "First error" })
      .mockResolvedValueOnce({});

    render(<LockScreen treasuryId="123" treasuryName="Test" />);
    const button = screen.getByRole("button", { name: /Unlock with Passkey/ });

    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
