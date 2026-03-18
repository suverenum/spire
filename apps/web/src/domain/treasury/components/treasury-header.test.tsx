import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TreasuryHeader } from "./treasury-header";

function renderWithClient(ui: React.ReactElement) {
	const queryClient = new QueryClient();
	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
	);
}

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
		prefetch: vi.fn(),
	}),
}));

const mockLogoutAction = vi.fn();

vi.mock("@/domain/auth/actions/auth-actions", () => ({
	logoutAction: (...args: unknown[]) => mockLogoutAction(...args),
}));

vi.mock("@/components/ui/toast", () => ({
	toast: vi.fn(),
}));

vi.mock("@/components/providers", () => ({
	clearPersistedCache: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("TreasuryHeader", () => {
	const addr = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;

	beforeEach(() => {
		mockPush.mockReset();
		mockLogoutAction.mockReset();
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn().mockResolvedValue(undefined),
			},
		});
	});

	it("renders treasury name", () => {
		renderWithClient(<TreasuryHeader name="My Treasury" address={addr} />);
		expect(screen.getByText("My Treasury")).toBeInTheDocument();
	});

	it("renders truncated address", () => {
		renderWithClient(<TreasuryHeader name="Test" address={addr} />);
		expect(screen.getByText(/0x1234...5678/)).toBeInTheDocument();
	});

	it("renders settings button", () => {
		renderWithClient(<TreasuryHeader name="Test" address={addr} />);
		expect(screen.getByLabelText("Settings")).toBeInTheDocument();
	});

	it("renders logout button", () => {
		renderWithClient(<TreasuryHeader name="Test" address={addr} />);
		expect(screen.getByLabelText("Logout")).toBeInTheDocument();
	});

	it("navigates to settings on settings button click", () => {
		renderWithClient(<TreasuryHeader name="Test" address={addr} />);
		fireEvent.click(screen.getByLabelText("Settings"));
		expect(mockPush).toHaveBeenCalledWith("/settings");
	});

	it("copies address to clipboard on address button click", async () => {
		const { toast: mockToast } = await import("@/components/ui/toast");
		renderWithClient(<TreasuryHeader name="Test" address={addr} />);

		// The address button is the one with the truncated address text
		const addressButton = screen.getByText(/0x1234...5678/).closest("button");
		expect(addressButton).toBeDefined();

		await act(async () => {
			fireEvent.click(addressButton!);
		});

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(addr);
		expect(mockToast).toHaveBeenCalledWith("Address copied!", "success");
	});

	it("shows error toast when clipboard copy fails", async () => {
		const { toast: mockToast } = await import("@/components/ui/toast");
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn().mockRejectedValue(new Error("Not allowed")),
			},
		});

		renderWithClient(<TreasuryHeader name="Test" address={addr} />);
		const addressButton = screen.getByText(/0x1234...5678/).closest("button");

		await act(async () => {
			fireEvent.click(addressButton!);
		});

		expect(mockToast).toHaveBeenCalledWith("Failed to copy address", "error");
	});

	it("calls logoutAction on logout button click", async () => {
		mockLogoutAction.mockResolvedValue(undefined);
		renderWithClient(<TreasuryHeader name="Test" address={addr} />);

		await act(async () => {
			fireEvent.click(screen.getByLabelText("Logout"));
		});

		expect(mockLogoutAction).toHaveBeenCalled();
	});

	it("disables logout button while logging out", async () => {
		// Make logoutAction hang so isPending stays true
		let resolveLogout: () => void;
		mockLogoutAction.mockReturnValue(
			new Promise<void>((resolve) => {
				resolveLogout = resolve;
			}),
		);

		renderWithClient(<TreasuryHeader name="Test" address={addr} />);
		const logoutButton = screen.getByLabelText("Logout");

		await act(async () => {
			fireEvent.click(logoutButton);
		});

		expect(logoutButton).toBeDisabled();

		// Resolve to clean up
		await act(async () => {
			resolveLogout?.();
		});
	});

	it("handles logoutAction throwing (redirect throws)", async () => {
		mockLogoutAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
		renderWithClient(<TreasuryHeader name="Test" address={addr} />);

		// Should not throw
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Logout"));
		});

		expect(mockLogoutAction).toHaveBeenCalled();
	});
});
