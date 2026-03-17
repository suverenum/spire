import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { getFeeSponsorConfig, getFeePayer } from "../fee-sponsor";

describe("fee-sponsor", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getFeeSponsorConfig", () => {
    it("returns remote mode when no TEMPO_FEE_PAYER_KEY is set", () => {
      vi.stubEnv("TEMPO_FEE_PAYER_KEY", "");
      const config = getFeeSponsorConfig();
      expect(config.enabled).toBe(true);
      expect(config.mode).toBe("remote");
      expect(config.feePayer).toBeUndefined();
    });

    it("returns local mode with fee payer account when TEMPO_FEE_PAYER_KEY is set", () => {
      const testKey =
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
      vi.stubEnv("TEMPO_FEE_PAYER_KEY", testKey);
      const config = getFeeSponsorConfig();
      expect(config.enabled).toBe(true);
      expect(config.mode).toBe("local");
      expect(config.feePayer).toBeDefined();
      expect(config.feePayer!.type).toBe("local");
    });
  });

  describe("getFeePayer", () => {
    it("returns true (remote sponsor) when no fee payer key is configured", () => {
      vi.stubEnv("TEMPO_FEE_PAYER_KEY", "");
      const feePayer = getFeePayer();
      expect(feePayer).toBe(true);
    });

    it("returns PrivateKeyAccount when fee payer key is configured", () => {
      const testKey =
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
      vi.stubEnv("TEMPO_FEE_PAYER_KEY", testKey);
      const feePayer = getFeePayer();
      expect(feePayer).not.toBe(true);
      expect(typeof feePayer).toBe("object");
    });
  });
});
