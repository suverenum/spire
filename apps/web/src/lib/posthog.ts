import posthog from "posthog-js";

let initialized = false;

export function initPostHog() {
	if (typeof window === "undefined" || initialized || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
		return;
	}

	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
		api_host: "https://us.i.posthog.com",
		person_profiles: "identified_only",
		capture_pageview: true,
		capture_pageleave: true,
		autocapture: false,
	});

	initialized = true;
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
	if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
	posthog.capture(event, properties);
}

export const AnalyticsEvents = {
	TREASURY_CREATED: "treasury_created",
	PAYMENT_SENT: "payment_sent",
	PAYMENT_RECEIVED: "payment_received",
	LOGOUT: "logout",
} as const;
