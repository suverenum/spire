"use client";

import { useEffect, useState } from "react";

function formatTime(date: Date): string {
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function WebSocketBanner({ isConnected }: { isConnected: boolean }) {
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

	useEffect(() => {
		setLastUpdated(new Date());
		const interval = setInterval(() => setLastUpdated(new Date()), isConnected ? 5_000 : 15_000);
		return () => clearInterval(interval);
	}, [isConnected]);

	if (!lastUpdated) return null;

	return <p className="mb-4 text-xs text-muted-foreground">Updated at {formatTime(lastUpdated)}</p>;
}
