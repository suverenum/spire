import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SendPaymentForm } from "./send-payment-form";

const mockMutate = vi.fn();
const mockUseSendPayment = vi.fn();

vi.mock("../hooks/use-send-payment", () => ({
  useSendPayment: (...args: unknown[]) => mockUseSendPayment(...args),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const addr = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;
const validRecipient =
  "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`;

describe("SendPaymentForm", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mockUseSendPayment.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it("renders nothing when closed", () => {
    const { container } = renderWithQuery(
      <SendPaymentForm open={false} onClose={() => {}} fromAddress={addr} />,
    );
    expect(container.querySelector("form")).toBeNull();
  });

  it("renders form when open", () => {
    renderWithQuery(
      <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Recipient Address")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Token")).toBeInTheDocument();
  });

  it("shows validation errors on submit with empty form", () => {
    renderWithQuery(
      <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));
    expect(
      screen.getByText("Invalid address format (0x...)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Amount must be a valid number"),
    ).toBeInTheDocument();
  });

  it("shows memo field", () => {
    renderWithQuery(
      <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
    );
    expect(screen.getByLabelText("Memo (optional)")).toBeInTheDocument();
  });

  it("shows all token options", () => {
    renderWithQuery(
      <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
    );
    const select = screen.getByLabelText("Token");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("AlphaUSD")).toBeInTheDocument();
    expect(screen.getByText("BetaUSD")).toBeInTheDocument();
    expect(screen.getByText("pathUSD")).toBeInTheDocument();
    expect(screen.getByText("ThetaUSD")).toBeInTheDocument();
  });

  describe("form field interactions", () => {
    it("allows typing in recipient address field", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const input = screen.getByLabelText("Recipient Address");
      fireEvent.change(input, { target: { value: validRecipient } });
      expect(input).toHaveValue(validRecipient);
    });

    it("allows typing in amount field", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const input = screen.getByLabelText("Amount");
      fireEvent.change(input, { target: { value: "25.50" } });
      expect(input).toHaveValue("25.50");
    });

    it("allows typing in memo field", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const input = screen.getByLabelText("Memo (optional)");
      fireEvent.change(input, { target: { value: "Test memo" } });
      expect(input).toHaveValue("Test memo");
    });

    it("allows selecting a different token", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const select = screen.getByLabelText("Token");
      fireEvent.change(select, { target: { value: "BetaUSD" } });
      expect(select).toHaveValue("BetaUSD");
    });
  });

  describe("validation", () => {
    it("shows error for invalid address format", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const toInput = screen.getByLabelText("Recipient Address");
      fireEvent.change(toInput, { target: { value: "not-an-address" } });
      fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));
      expect(
        screen.getByText("Invalid address format (0x...)"),
      ).toBeInTheDocument();
    });

    it("shows error for zero amount", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const amountInput = screen.getByLabelText("Amount");
      fireEvent.change(amountInput, { target: { value: "0" } });
      fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));
      expect(
        screen.getByText("Amount must be greater than 0"),
      ).toBeInTheDocument();
    });

    it("shows error for negative amount", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const amountInput = screen.getByLabelText("Amount");
      fireEvent.change(amountInput, { target: { value: "-5" } });
      fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));
      expect(
        screen.getByText("Amount must be a valid number"),
      ).toBeInTheDocument();
    });

    it("shows error for non-numeric amount", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const amountInput = screen.getByLabelText("Amount");
      fireEvent.change(amountInput, { target: { value: "abc" } });
      fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));
      expect(
        screen.getByText("Amount must be a valid number"),
      ).toBeInTheDocument();
    });

    it("shows error for memo exceeding 32 bytes", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const toInput = screen.getByLabelText("Recipient Address");
      const amountInput = screen.getByLabelText("Amount");
      const memoInput = screen.getByLabelText("Memo (optional)");

      fireEvent.change(toInput, { target: { value: validRecipient } });
      fireEvent.change(amountInput, { target: { value: "10" } });
      fireEvent.change(memoInput, {
        target: { value: "a".repeat(33) },
      });
      fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));
      expect(
        screen.getByText("Memo must be 32 bytes or less"),
      ).toBeInTheDocument();
    });

    it("does not show memo error for exactly 32 bytes", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const toInput = screen.getByLabelText("Recipient Address");
      const amountInput = screen.getByLabelText("Amount");
      const memoInput = screen.getByLabelText("Memo (optional)");

      fireEvent.change(toInput, { target: { value: validRecipient } });
      fireEvent.change(amountInput, { target: { value: "10" } });
      fireEvent.change(memoInput, {
        target: { value: "a".repeat(32) },
      });
      fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));
      expect(
        screen.queryByText("Memo must be 32 bytes or less"),
      ).not.toBeInTheDocument();
    });

    it("accepts valid address format", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const toInput = screen.getByLabelText("Recipient Address");
      const amountInput = screen.getByLabelText("Amount");

      fireEvent.change(toInput, { target: { value: validRecipient } });
      fireEvent.change(amountInput, { target: { value: "10" } });
      fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));
      expect(
        screen.queryByText("Invalid address format (0x...)"),
      ).not.toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("calls mutate with correct params on valid submission", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const toInput = screen.getByLabelText("Recipient Address");
      const amountInput = screen.getByLabelText("Amount");
      const memoInput = screen.getByLabelText("Memo (optional)");

      fireEvent.change(toInput, { target: { value: validRecipient } });
      fireEvent.change(amountInput, { target: { value: "25.50" } });
      fireEvent.change(memoInput, { target: { value: "Test payment" } });
      fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(
        {
          to: validRecipient,
          amount: "25.50",
          token: "AlphaUSD",
          memo: "Test payment",
          fromAddress: addr,
        },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it("does not call mutate if validation fails", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("submits with undefined memo when memo is empty", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const toInput = screen.getByLabelText("Recipient Address");
      const amountInput = screen.getByLabelText("Amount");

      fireEvent.change(toInput, { target: { value: validRecipient } });
      fireEvent.change(amountInput, { target: { value: "10" } });
      fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ memo: undefined }),
        expect.any(Object),
      );
    });

    it("resets form and calls onClose on successful mutation", () => {
      const onClose = vi.fn();
      mockMutate.mockImplementation(
        (_params: unknown, options: { onSuccess: () => void }) => {
          options.onSuccess();
        },
      );

      renderWithQuery(
        <SendPaymentForm open={true} onClose={onClose} fromAddress={addr} />,
      );
      const toInput = screen.getByLabelText("Recipient Address");
      const amountInput = screen.getByLabelText("Amount");

      fireEvent.change(toInput, { target: { value: validRecipient } });
      fireEvent.change(amountInput, { target: { value: "10" } });
      fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));

      expect(onClose).toHaveBeenCalled();
      // Form fields should be reset
      expect(toInput).toHaveValue("");
      expect(amountInput).toHaveValue("");
    });

    it("does not reset form if mutation throws (server failure)", () => {
      const onClose = vi.fn();
      mockMutate.mockImplementation(() => {
        // Mutation throws on server failure, onSuccess is never called
      });

      renderWithQuery(
        <SendPaymentForm open={true} onClose={onClose} fromAddress={addr} />,
      );
      const toInput = screen.getByLabelText("Recipient Address");
      const amountInput = screen.getByLabelText("Amount");

      fireEvent.change(toInput, { target: { value: validRecipient } });
      fireEvent.change(amountInput, { target: { value: "10" } });
      fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));

      expect(onClose).not.toHaveBeenCalled();
      expect(toInput).toHaveValue(validRecipient);
    });

    it("shows Sending... text when mutation is pending", () => {
      mockUseSendPayment.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      });

      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      expect(screen.getByText("Sending...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Sending/ })).toBeDisabled();
    });

    it("submits with selected token", () => {
      renderWithQuery(
        <SendPaymentForm open={true} onClose={() => {}} fromAddress={addr} />,
      );
      const toInput = screen.getByLabelText("Recipient Address");
      const amountInput = screen.getByLabelText("Amount");
      const tokenSelect = screen.getByLabelText("Token");

      fireEvent.change(toInput, { target: { value: validRecipient } });
      fireEvent.change(amountInput, { target: { value: "10" } });
      fireEvent.change(tokenSelect, { target: { value: "BetaUSD" } });
      fireEvent.click(screen.getByRole("button", { name: /Send Payment/ }));

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ token: "BetaUSD" }),
        expect.any(Object),
      );
    });
  });
});
