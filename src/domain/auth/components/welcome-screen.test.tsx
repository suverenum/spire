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
import { WelcomeScreen } from "./welcome-screen";

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

describe("WelcomeScreen", () => {
  beforeEach(() => {
    mockLoginAction.mockReset();
    mockLoginAction.mockResolvedValue({
      tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
      treasuryName: "My Treasury",
    });
    mockConnectAsync.mockReset();
    mockConnectAsync.mockResolvedValue({
      accounts: ["0x1234567890abcdef1234567890abcdef12345678"],
    });
    mockPush.mockReset();
  });

  it("renders Spire branding", () => {
    render(<WelcomeScreen />, { wrapper: Wrapper });
    expect(screen.getByText("Spire")).toBeInTheDocument();
  });

  it("renders unlock button", () => {
    render(<WelcomeScreen />, { wrapper: Wrapper });
    expect(
      screen.getByRole("button", { name: /Unlock with Passkey/ }),
    ).toBeInTheDocument();
  });

  it("renders create treasury button", () => {
    render(<WelcomeScreen />, { wrapper: Wrapper });
    expect(
      screen.getByRole("button", { name: /Create Treasury/ }),
    ).toBeInTheDocument();
  });

  it("navigates to /create on create button click", () => {
    render(<WelcomeScreen />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button", { name: /Create Treasury/ }));
    expect(mockPush).toHaveBeenCalledWith("/create");
  });

  it("calls loginAction with address on unlock and navigates", async () => {
    render(<WelcomeScreen />, { wrapper: Wrapper });
    const button = screen.getByRole("button", { name: /Unlock with Passkey/ });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockConnectAsync).toHaveBeenCalled();
    expect(mockLoginAction).toHaveBeenCalledWith(
      "0x1234567890abcdef1234567890abcdef12345678",
    );
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("shows error when loginAction returns error", async () => {
    mockLoginAction.mockResolvedValue({
      error: "No treasury found for this passkey",
    });
    render(<WelcomeScreen />, { wrapper: Wrapper });
    const button = screen.getByRole("button", { name: /Unlock with Passkey/ });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No treasury found for this passkey",
    );
  });

  it("shows error when passkey connection fails", async () => {
    mockConnectAsync.mockRejectedValue(new Error("Passkey denied"));
    render(<WelcomeScreen />, { wrapper: Wrapper });
    const button = screen.getByRole("button", { name: /Unlock with Passkey/ });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Passkey denied");
  });

  it("clears previous error on new unlock attempt", async () => {
    mockLoginAction
      .mockResolvedValueOnce({ error: "First error" })
      .mockResolvedValueOnce({
        tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
      });

    render(<WelcomeScreen />, { wrapper: Wrapper });
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
