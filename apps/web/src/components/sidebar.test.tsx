import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./sidebar";

const mockPush = vi.fn();
const mockPathname = vi.fn().mockReturnValue("/dashboard");

vi.mock("next/navigation", () => ({
	usePathname: () => mockPathname(),
	useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		onClick,
		...props
	}: {
		href: string;
		children: React.ReactNode;
		onClick?: () => void;
	}) => (
		<a href={href} onClick={onClick} {...props}>
			{children}
		</a>
	),
}));

const mockQueryClientClear = vi.fn();
vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ clear: mockQueryClientClear }),
}));

const mockLogoutAction = vi.fn().mockRejectedValue(new Error("NEXT_REDIRECT"));
vi.mock("@/domain/auth/actions/auth-actions", () => ({
	logoutAction: (...args: unknown[]) => mockLogoutAction(...args),
}));

const mockClearPersistedCache = vi.fn().mockResolvedValue(undefined);
vi.mock("@/components/providers", () => ({
	clearPersistedCache: (...args: unknown[]) => mockClearPersistedCache(...args),
}));

vi.mock("@/lib/posthog", () => ({
	AnalyticsEvents: { LOGOUT: "logout" },
	trackEvent: vi.fn(),
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("Sidebar", () => {
	it("renders treasury name", () => {
		render(<Sidebar treasuryName="My Treasury" />);
		// Appears in both mobile and desktop sidebars
		expect(screen.getAllByText("My Treasury")).toHaveLength(2);
	});

	it("renders all navigation items", () => {
		render(<Sidebar treasuryName="Test" />);
		expect(screen.getAllByText("Dashboard")).toHaveLength(2); // mobile + desktop
		expect(screen.getAllByText("Transactions")).toHaveLength(2);
		expect(screen.getAllByText("Accounts")).toHaveLength(2);
		expect(screen.getAllByText("Swap")).toHaveLength(2);
		expect(screen.getAllByText("Settings")).toHaveLength(2);
	});

	it("renders logout button", () => {
		render(<Sidebar treasuryName="Test" />);
		expect(screen.getAllByText("Logout")).toHaveLength(2);
	});

	it("highlights active nav item", () => {
		mockPathname.mockReturnValue("/transactions");
		render(<Sidebar treasuryName="Test" />);
		const links = screen.getAllByText("Transactions");
		// At least one should have the active class
		expect(
			links.some((link) =>
				link.closest("a")?.className.includes("bg-gray-100"),
			),
		).toBe(true);
	});

	it("opens mobile menu on hamburger click", async () => {
		render(<Sidebar treasuryName="Test" />);
		await userEvent.click(screen.getByLabelText("Open menu"));
		// The close button should now be visible
		const closeButtons = screen.getAllByLabelText("Close menu");
		expect(closeButtons.length).toBeGreaterThan(0);
	});

	it("calls logout on logout button click", async () => {
		render(<Sidebar treasuryName="Test" />);
		const logoutButtons = screen.getAllByText("Logout");
		await userEvent.click(logoutButtons[0]);
		expect(mockQueryClientClear).toHaveBeenCalled();
		expect(mockClearPersistedCache).toHaveBeenCalled();
		expect(mockLogoutAction).toHaveBeenCalled();
	});
});
