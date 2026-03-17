import { describe, it, expect, afterEach, vi } from "vitest";
import {
	render,
	screen,
	cleanup,
	act,
	fireEvent,
} from "@testing-library/react";
import { Toaster, toast } from "./toast";

afterEach(cleanup);

describe("Toast", () => {
	it("renders toaster without toasts", () => {
		render(<Toaster />);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("shows a toast when triggered", () => {
		render(<Toaster />);
		act(() => {
			toast("Hello world", "info");
		});
		expect(screen.getByText("Hello world")).toBeInTheDocument();
	});

	it("shows success toast with green styling", () => {
		render(<Toaster />);
		act(() => {
			toast("Success!", "success");
		});
		const alert = screen.getByRole("alert");
		expect(alert.className).toContain("bg-green-600");
	});

	it("shows error toast with red styling", () => {
		render(<Toaster />);
		act(() => {
			toast("Error!", "error");
		});
		const alert = screen.getByRole("alert");
		expect(alert.className).toContain("bg-red-600");
	});

	it("shows info toast with gray styling", () => {
		render(<Toaster />);
		act(() => {
			toast("Info message", "info");
		});
		const alert = screen.getByRole("alert");
		expect(alert.className).toContain("bg-gray-900");
	});

	it("auto-dismisses after timeout", () => {
		vi.useFakeTimers();
		render(<Toaster />);
		act(() => {
			toast("Temporary", "info");
		});
		expect(screen.getByText("Temporary")).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(3999);
		});
		expect(screen.getByText("Temporary")).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(screen.queryByText("Temporary")).not.toBeInTheDocument();
		vi.useRealTimers();
	});

	it("dismisses toast on dismiss button click", () => {
		render(<Toaster />);
		act(() => {
			toast("Dismissable toast", "info");
		});
		expect(screen.getByText("Dismissable toast")).toBeInTheDocument();

		// Click the dismiss (X) button
		const dismissButton = screen.getByRole("alert").querySelector("button");
		expect(dismissButton).toBeTruthy();
		fireEvent.click(dismissButton!);

		expect(screen.queryByText("Dismissable toast")).not.toBeInTheDocument();
	});

	it("can show multiple toasts simultaneously", () => {
		render(<Toaster />);
		act(() => {
			toast("First toast", "info");
			toast("Second toast", "success");
			toast("Third toast", "error");
		});
		expect(screen.getByText("First toast")).toBeInTheDocument();
		expect(screen.getByText("Second toast")).toBeInTheDocument();
		expect(screen.getByText("Third toast")).toBeInTheDocument();
		expect(screen.getAllByRole("alert")).toHaveLength(3);
	});

	it("dismissing one toast does not affect others", () => {
		render(<Toaster />);
		act(() => {
			toast("Keep me", "info");
			toast("Remove me", "error");
		});

		const alerts = screen.getAllByRole("alert");
		expect(alerts).toHaveLength(2);

		// Dismiss the second toast
		const secondDismissButton = alerts[1].querySelector("button");
		fireEvent.click(secondDismissButton!);

		expect(screen.getByText("Keep me")).toBeInTheDocument();
		expect(screen.queryByText("Remove me")).not.toBeInTheDocument();
	});

	it("defaults to info type when no type is specified", () => {
		render(<Toaster />);
		act(() => {
			toast("Default type");
		});
		const alert = screen.getByRole("alert");
		expect(alert.className).toContain("bg-gray-900");
	});

	it("does nothing when toast is called without Toaster mounted", () => {
		// No Toaster rendered -- addToastFn is null
		// This should not throw
		expect(() => {
			toast("Orphan toast", "info");
		}).not.toThrow();
	});

	it("sets addToastFn to null on Toaster unmount", () => {
		const { unmount } = render(<Toaster />);

		// Toast should work while mounted
		act(() => {
			toast("While mounted", "info");
		});
		expect(screen.getByText("While mounted")).toBeInTheDocument();

		unmount();

		// After unmount, calling toast should not throw (addToastFn is null)
		expect(() => {
			toast("After unmount", "info");
		}).not.toThrow();
	});
});
