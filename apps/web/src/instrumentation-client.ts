// This file configures Next.js client instrumentation hooks.
// Sentry client initialization is handled by sentry.client.config.ts — do NOT duplicate Sentry.init() here.

import * as Sentry from "@sentry/nextjs";

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
