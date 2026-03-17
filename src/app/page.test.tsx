import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe("Home page module", () => {
  it("exports a default function", async () => {
    const mod = await import("./page");
    expect(typeof mod.default).toBe("function");
  });
});
