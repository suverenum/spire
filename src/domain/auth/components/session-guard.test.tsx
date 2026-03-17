import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
} from "@testing-library/react";
import { SessionGuard } from "./session-guard";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    prefetch: vi.fn(),
  }),
}));

const mockLogoutAction = vi.fn().mockRejectedValue(new Error("NEXT_REDIRECT"));
const mockTouchSessionAction = vi.fn().mockResolvedValue(undefined);

vi.mock("@/domain/auth/actions/auth-actions", () => ({
  logoutAction: (...args: unknown[]) => mockLogoutAction(...args),
  touchSessionAction: (...args: unknown[]) => mockTouchSessionAction(...args),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("SessionGuard", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockLogoutAction.mockReset();
    mockLogoutAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
  });

  it("renders children", () => {
    render(
      <SessionGuard authenticatedAt={Date.now()}>
        <p>Protected content</p>
      </SessionGuard>,
    );
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("renders with recent auth timestamp", () => {
    render(
      <SessionGuard authenticatedAt={Date.now()}>
        <p>Still valid</p>
      </SessionGuard>,
    );
    expect(screen.getByText("Still valid")).toBeInTheDocument();
  });

  it("does not logout based on auth time alone when user is active", () => {
    vi.useFakeTimers();
    // authenticatedAt from 20 minutes ago (max is 15 min)
    const twentyMinutesAgo = Date.now() - 20 * 60 * 1000;

    render(
      <SessionGuard authenticatedAt={twentyMinutesAgo}>
        <p>Should stay</p>
      </SessionGuard>,
    );

    // The check runs after 60 seconds timeout, but user just rendered (activity is recent)
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    // Should NOT logout because the guard checks inactivity, not auth time
    expect(mockLogoutAction).not.toHaveBeenCalled();
  });

  it("redirects when inactivity exceeds SESSION_MAX_AGE_MS", () => {
    vi.useFakeTimers();
    const now = Date.now();

    render(
      <SessionGuard authenticatedAt={now}>
        <p>Content</p>
      </SessionGuard>,
    );

    // Advance time by 16 minutes without any activity
    act(() => {
      vi.advanceTimersByTime(16 * 60 * 1000);
    });

    expect(mockLogoutAction).toHaveBeenCalled();
  });

  it("does not redirect when session is fresh and user is active", () => {
    vi.useFakeTimers();
    const now = Date.now();

    render(
      <SessionGuard authenticatedAt={now}>
        <p>Content</p>
      </SessionGuard>,
    );

    // Simulate user activity before the check
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    // Trigger activity
    act(() => {
      fireEvent.mouseMove(window);
    });

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("registers mousemove event listener", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    render(
      <SessionGuard authenticatedAt={Date.now()}>
        <p>Content</p>
      </SessionGuard>,
    );

    expect(addSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
  });

  it("registers keydown event listener", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    render(
      <SessionGuard authenticatedAt={Date.now()}>
        <p>Content</p>
      </SessionGuard>,
    );

    expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("registers click event listener", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    render(
      <SessionGuard authenticatedAt={Date.now()}>
        <p>Content</p>
      </SessionGuard>,
    );

    expect(addSpy).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("registers touchstart event listener", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    render(
      <SessionGuard authenticatedAt={Date.now()}>
        <p>Content</p>
      </SessionGuard>,
    );

    expect(addSpy).toHaveBeenCalledWith("touchstart", expect.any(Function));
  });

  it("removes event listeners on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(
      <SessionGuard authenticatedAt={Date.now()}>
        <p>Content</p>
      </SessionGuard>,
    );

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("click", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("touchstart", expect.any(Function));
  });

  it("clears timeout on unmount", () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const { unmount } = render(
      <SessionGuard authenticatedAt={Date.now()}>
        <p>Content</p>
      </SessionGuard>,
    );

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("activity resets the inactivity timer preventing expiration", () => {
    vi.useFakeTimers();
    const now = Date.now();

    render(
      <SessionGuard authenticatedAt={now}>
        <p>Content</p>
      </SessionGuard>,
    );

    // Advance 14 minutes
    act(() => {
      vi.advanceTimersByTime(14 * 60 * 1000);
    });

    // Activity resets inactivity
    act(() => {
      fireEvent.keyDown(window, { key: "a" });
    });

    // Advance another 14 minutes (only 14 min since last activity - under 15 min threshold)
    act(() => {
      vi.advanceTimersByTime(14 * 60 * 1000);
    });

    // Should NOT logout because only 14 min of inactivity (< 15 min threshold)
    expect(mockLogoutAction).not.toHaveBeenCalled();
  });
});
