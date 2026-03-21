"use client";

import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function formatAmount(raw: string, decimals = 6): string {
	const n = Number(raw) / 10 ** decimals;
	return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface SpendingLimitsCardProps {
	maxPerTx: string;
	dailyLimit: string;
	spendingCap: string;
	isActive: boolean;
	editingLimits: boolean;
	newMaxPerTx: string;
	newDailyLimit: string;
	onSetNewMaxPerTx: (v: string) => void;
	onSetNewDailyLimit: (v: string) => void;
	onStartEditing: () => void;
	onSave: () => void;
	onCancel: () => void;
	isSaving: boolean;
}

export function SpendingLimitsCard({
	maxPerTx,
	dailyLimit,
	spendingCap,
	isActive,
	editingLimits,
	newMaxPerTx,
	newDailyLimit,
	onSetNewMaxPerTx,
	onSetNewDailyLimit,
	onStartEditing,
	onSave,
	onCancel,
	isSaving,
}: SpendingLimitsCardProps) {
	return (
		<Card>
			<div className="flex items-center justify-between p-4">
				<h2 className="flex items-center gap-2 font-semibold">
					<DollarSign className="h-4 w-4" /> Spending Limits
				</h2>
				{!editingLimits && isActive && (
					<Button
						variant="outline"
						size="sm"
						onClick={onStartEditing}
						data-testid="edit-limits-btn"
					>
						Edit
					</Button>
				)}
			</div>
			{editingLimits ? (
				<div className="border-border space-y-3 border-t p-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="edit-max-per-tx"
								className="text-muted-foreground mb-1 block text-xs font-medium"
							>
								Per-tx cap ($)
							</label>
							<Input
								id="edit-max-per-tx"
								type="number"
								value={newMaxPerTx}
								onChange={(e) => onSetNewMaxPerTx(e.target.value)}
							/>
						</div>
						<div>
							<label
								htmlFor="edit-daily-limit"
								className="text-muted-foreground mb-1 block text-xs font-medium"
							>
								Daily limit ($)
							</label>
							<Input
								id="edit-daily-limit"
								type="number"
								value={newDailyLimit}
								onChange={(e) => onSetNewDailyLimit(e.target.value)}
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<Button size="sm" onClick={onSave} disabled={isSaving}>
							{isSaving ? "Updating on-chain..." : "Save & Update On-Chain"}
						</Button>
						<Button size="sm" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					</div>
				</div>
			) : (
				<div className="border-border grid grid-cols-3 gap-4 border-t p-4 text-center">
					<div>
						<p className="text-muted-foreground text-xs">Per-tx cap</p>
						<p className="text-lg font-semibold">${formatAmount(maxPerTx)}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Daily limit</p>
						<p className="text-lg font-semibold">${formatAmount(dailyLimit)}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Total cap</p>
						<p className="text-lg font-semibold">${formatAmount(spendingCap)}</p>
					</div>
				</div>
			)}
		</Card>
	);
}
