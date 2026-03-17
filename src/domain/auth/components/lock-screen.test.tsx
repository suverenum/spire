import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
} from "@testing-library/react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { LockScreen } from "./lock-screen";

const mockLoginAction = vi.fn();
const mockConnectAsync = vi.fn();
const mockPush = vi.fn();

vi.mock("../actions/auth-actions", () => ({
  loginAction: (...args: unknown[]) => mockLoginAction(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useConnect: () => ({
      connectAsync: mockConnectAsync,
      connectors: [{ id: "webAuthn", name: "WebAuthn" }],
    }),
  };
});

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("LockScreen", () => {
  beforeEach(() => {
    mockLoginAction.mockReset();
    mockLoginAction.mockResolvedValue({
      tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
    });
    mockConnectAsync.mockReset();
    mockConnectAsync.mockResolvedValue({
      accounts: ["0x1234567890abcdef1234567890abcdef12345678"],
    });
    mockPush.mockReset();
  });

  it("renders treasury name", () => {
    render(<LockScreen treasuryId="123" treasuryName="My Treasury" />, {
      wrapper: Wrapper,
    });
    expect(screen.getByText("My Treasury")).toBeInTheDocument();
  });

  it("shows passkey prompt text", () => {
    render(<LockScreen treasuryId="123" treasuryName="Test" />, {
      wrapper: Wrapper,
    });
    expect(
      screen.getByText("Authenticate with your passkey to continue"),
    ).toBeInTheDocument();
  });

  it("renders unlock button", () => {
    render(<LockScreen treasuryId="123" treasuryName="Test" />, {
      wrapper: Wrapper,
    });
    expect(
      screen.getByRole("button", { name: /Unlock with Passkey/ }),
    ).toBeInTheDocument();
  });

  it("calls loginAction with address on button click and navigates", async () => {
    render(<LockScreen treasuryId="123" treasuryName="Test" />, {
      wrapper: Wrapper,
    });
    const button = screen.getByRole("button", { name: /Unlock with Passkey/ });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockConnectAsync).toHaveBeenCalled();
    expect(mockLoginAction).toHaveBeenCalledWith(
      "123",
      "0x1234567890abcdef1234567890abcdef12345678",
    );
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("shows error message when loginAction returns error", async () => {
    mockLoginAction.mockResolvedValue({ error: "Authentication failed" });
    render(<LockScreen treasuryId="123" treasuryName="Test" />, {
      wrapper: Wrapper,
    });
    const button = screen.getByRole("button", { name: /Unlock with Passkey/ });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Authentication failed",
    );
  });

  it("shows error when passkey connection fails", async () => {
    mockConnectAsync.mockRejectedValue(new Error("Passkey denied"));
    render(<LockScreen treasuryId="123" treasuryName="Test" />, {
      wrapper: Wrapper,
    });
    const button = screen.getByRole("button", { name: /Unlock with Passkey/ });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Passkey denied");
  });

  it("clears previous error on new unlock attempt", async () => {
    mockLoginAction
      .mockResolvedValueOnce({ error: "First error" })
      .mockResolvedValueOnce({});

    render(<LockScreen treasuryId="123" treasuryName="Test" />, {
      wrapper: Wrapper,
    });
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
