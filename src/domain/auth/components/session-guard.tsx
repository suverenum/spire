"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SESSION_MAX_AGE_MS } from "@/lib/constants";
import { logoutAction } from "@/domain/auth/actions/auth-actions";

interface SessionGuardProps {
  children: React.ReactNode;
  authenticatedAt: number;
}

export function SessionGuard({ children, authenticatedAt }: SessionGuardProps) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(0);

  useEffect(() => {
    lastActivityRef.current = Date.now();

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkExpiry = () => {
      const now = Date.now();
      const timeSinceAuth = now - authenticatedAt;
      const timeSinceActivity = now - lastActivityRef.current;

      if (
        timeSinceAuth > SESSION_MAX_AGE_MS ||
        timeSinceActivity > SESSION_MAX_AGE_MS
      ) {
        logoutAction().catch(() => {
          // redirect throws in server actions
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

    timeoutRef.current = setTimeout(checkExpiry, 60_000);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [authenticatedAt, router]);

  return <>{children}</>;
}
