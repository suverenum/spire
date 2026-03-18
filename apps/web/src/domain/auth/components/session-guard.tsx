"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { clearPersistedCache } from "@/components/providers";
import { logoutAction, touchSessionAction } from "@/domain/auth/actions/auth-actions";
import { SESSION_MAX_AGE_MS } from "@/lib/constants";

const SESSION_REFRESH_MS = 5 * 60 * 1000; // Refresh session every 5 min of activity

interface SessionGuardProps {
	children: React.ReactNode;
	authenticatedAt: number;
}

export function SessionGuard({ children, authenticatedAt }: SessionGuardProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastActivityRef = useRef(0);
	const lastRefreshRef = useRef(authenticatedAt);

	useEffect(() => {
		const serverElapsed = Date.now() - authenticatedAt;
		lastActivityRef.current = serverElapsed > SESSION_MAX_AGE_MS ? authenticatedAt : Date.now();

		let throttleTimer: ReturnType<typeof setTimeout> | null = null;
		const handleActivity = () => {
			if (throttleTimer) return;
			throttleTimer = setTimeout(() => {
				throttleTimer = null;
			}, 2000);
			lastActivityRef.current = Date.now();
			const now = Date.now();
			if (now - lastRefreshRef.current > SESSION_REFRESH_MS) {
				const prev = lastRefreshRef.current;
				lastRefreshRef.current = now;
				touchSessionAction().catch(() => {
					// Reset so next activity retries the refresh
					lastRefreshRef.current = prev;
				});
			}
		};

		const checkExpiry = () => {
			const now = Date.now();
			const timeSinceActivity = now - lastActivityRef.current;

			if (timeSinceActivity > SESSION_MAX_AGE_MS) {
				queryClient.clear();
				void clearPersistedCache().finally(() => {
					logoutAction().catch(() => {
						// logoutAction calls redirect("/") which throws in server actions.
						// If it fails for a different reason, force a client-side redirect
						// so the user never stays on a protected page after session expiry.
						router.replace("/");
					});
				});
				return;
			}

			const remaining = SESSION_MAX_AGE_MS - timeSinceActivity;
			timeoutRef.current = setTimeout(checkExpiry, Math.min(remaining, 60_000));
		};

		window.addEventListener("mousemove", handleActivity);
		window.addEventListener("keydown", handleActivity);
		window.addEventListener("click", handleActivity);
		window.addEventListener("touchstart", handleActivity);

		checkExpiry();

		return () => {
			window.removeEventListener("mousemove", handleActivity);
			window.removeEventListener("keydown", handleActivity);
			window.removeEventListener("click", handleActivity);
			window.removeEventListener("touchstart", handleActivity);
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
			if (throttleTimer) clearTimeout(throttleTimer);
		};
	}, [authenticatedAt, queryClient, router]);

	return <>{children}</>;
}
