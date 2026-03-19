"use client";

import { cn } from "@/lib/utils";

interface BridgeStatusBadgeProps {
	status: "pending" | "bridging" | "completed" | "failed";
}

export function BridgeStatusBadge({ status }: BridgeStatusBadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
				status === "pending" && "bg-yellow-100 text-yellow-800",
				status === "bridging" && "bg-blue-100 text-blue-800",
				status === "completed" && "bg-green-100 text-green-800",
				status === "failed" && "bg-red-100 text-red-800",
			)}
		>
			{status === "bridging" && (
				<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
			)}
			{status === "pending" && "Pending"}
			{status === "bridging" && "Bridging..."}
			{status === "completed" && "Arrived"}
			{status === "failed" && "Failed"}
		</span>
	);
}
