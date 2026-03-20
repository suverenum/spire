import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

export function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
}

export function renderWithProviders(
	ui: ReactElement,
	options?: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient },
) {
	const queryClient = options?.queryClient ?? createTestQueryClient();
	function Wrapper({ children }: { children: ReactNode }) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
	}
	const { queryClient: _discard, ...renderOptions } = options ?? {};
	return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient };
}
