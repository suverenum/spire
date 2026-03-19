"use client";

import { Bot } from "lucide-react";

interface MultisigBadgeProps {
	ownerCount: number;
	pendingCount?: number;
}

export function MultisigBadge({ pendingCount }: MultisigBadgeProps) {
	return (
		<div className="flex items-center gap-1.5">
			<span
				data-testid="multisig-badge"
				className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400"
			>
				<Bot className="h-3 w-3" />
				Agent
			</span>
			{pendingCount != null && pendingCount > 0 && (
				<span
					data-testid="pending-badge"
					className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400"
				>
					{pendingCount} pending
				</span>
			)}
		</div>
	);
}
