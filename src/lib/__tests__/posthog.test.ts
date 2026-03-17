import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
  },
}));

import posthog from "posthog-js";
import { initPostHog, trackEvent, AnalyticsEvents } from "../posthog";

describe("posthog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
  });

  describe("AnalyticsEvents", () => {
    it("defines all core events", () => {
      expect(AnalyticsEvents.TREASURY_CREATED).toBe("treasury_created");
      expect(AnalyticsEvents.PAYMENT_SENT).toBe("payment_sent");
      expect(AnalyticsEvents.PAYMENT_RECEIVED).toBe("payment_received");
      expect(AnalyticsEvents.LOGOUT).toBe("logout");
    });
  });

  describe("trackEvent", () => {
    it("does not call posthog.capture when no key is set", () => {
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
      trackEvent("test_event");
      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it("calls posthog.capture when key is set", () => {
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_key");
      trackEvent("test_event", { foo: "bar" });
      expect(posthog.capture).toHaveBeenCalledWith("test_event", {
        foo: "bar",
      });
    });
  });

  describe("initPostHog", () => {
    it("does not initialize when no key is set", () => {
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
      initPostHog();
      expect(posthog.init).not.toHaveBeenCalled();
    });

    it("initializes posthog when key is set", () => {
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_key");
      initPostHog();
      expect(posthog.init).toHaveBeenCalledWith("phc_test_key", {
        api_host: "https://us.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: false,
      });
    });
  });
});
