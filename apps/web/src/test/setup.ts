import "@testing-library/jest-dom/vitest";

// happy-dom's localStorage may not fully implement the Web Storage API,
// causing wagmi's createConfig to fail with "storage.getItem is not a function"
if (
	typeof globalThis.localStorage === "undefined" ||
	typeof globalThis.localStorage?.getItem !== "function"
) {
	const store = new Map<string, string>();
	Object.defineProperty(globalThis, "localStorage", {
		value: {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, value);
			},
			removeItem: (key: string) => {
				store.delete(key);
			},
			clear: () => {
				store.clear();
			},
			get length() {
				return store.size;
			},
			key: (index: number) => [...store.keys()][index] ?? null,
		},
		writable: true,
		configurable: true,
	});
}
