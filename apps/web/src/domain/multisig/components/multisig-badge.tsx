"use client";

import { Shield } from "lucide-react";

interface MultisigBadgeProps {
	ownerCount: number;
	pendingCount?: number;
}

export function MultisigBadge({
	ownerCount,
	pendingCount,
}: MultisigBadgeProps) {
	return (
		<div className="flex items-center gap-1.5">
			<span
				data-testid="multisig-badge"
				className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
			>
				<Shield className="h-3 w-3" />
				Multisig {ownerCount}
			</span>
			{pendingCount != null && pendingCount > 0 && (
				<span
					data-testid="pending-badge"
					className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
				>
					{pendingCount} pending
				</span>
			)}
		</div>
	);
}
