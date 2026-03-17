import { describe, it, expect, vi } from "vitest";

// Mock next modules used by the server component
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

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue([]),
        where: vi.fn().mockResolvedValue([]),
      })),
    })),
  },
}));

describe("Home page module", () => {
  it("exports a default function", async () => {
    const mod = await import("./page");
    expect(typeof mod.default).toBe("function");
  });
});
