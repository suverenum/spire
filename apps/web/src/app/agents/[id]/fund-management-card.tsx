"use client";

import { AlertTriangle, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface FundManagementCardProps {
	showTopUp: boolean;
	topUpAmount: string;
	onSetTopUpAmount: (v: string) => void;
	onShowTopUp: () => void;
	onHideTopUp: () => void;
	onTopUp: () => void;
	isTopUpPending: boolean;
	showWithdrawConfirm: boolean;
	onShowWithdraw: () => void;
	onHideWithdraw: () => void;
	onWithdraw: () => void;
	isWithdrawPending: boolean;
}

export function FundManagementCard({
	showTopUp,
	topUpAmount,
	onSetTopUpAmount,
	onShowTopUp,
	onHideTopUp,
	onTopUp,
	isTopUpPending,
	showWithdrawConfirm,
	onShowWithdraw,
	onHideWithdraw,
	onWithdraw,
	isWithdrawPending,
}: FundManagementCardProps) {
	return (
		<Card>
			<div className="p-4">
				<h2 className="mb-3 flex items-center gap-2 font-semibold">
					<Upload className="h-4 w-4" /> Fund Management
				</h2>
				<div className="flex flex-wrap gap-3">
					{showTopUp ? (
						<div className="flex items-end gap-2">
							<div>
								<label htmlFor="top-up-amount" className="text-muted-foreground mb-1 block text-xs">
									Amount ($)
								</label>
								<Input
									id="top-up-amount"
									type="number"
									placeholder="10.00"
									value={topUpAmount}
									onChange={(e) => onSetTopUpAmount(e.target.value)}
									className="w-32"
								/>
							</div>
							<Button size="sm" onClick={onTopUp} disabled={isTopUpPending || !topUpAmount}>
								{isTopUpPending ? "Sending..." : "Top Up"}
							</Button>
							<Button size="sm" variant="outline" onClick={onHideTopUp}>
								Cancel
							</Button>
						</div>
					) : (
						<Button variant="outline" onClick={onShowTopUp} data-testid="top-up-btn">
							<Plus className="mr-1 h-4 w-4" /> Top Up
						</Button>
					)}

					{showWithdrawConfirm ? (
						<div className="border-border bg-muted flex items-center gap-2 rounded-lg border p-3">
							<AlertTriangle className="h-5 w-5 text-red-400" />
							<span className="text-sm text-red-400">Pull ALL funds back?</span>
							<Button
								size="sm"
								onClick={onWithdraw}
								disabled={isWithdrawPending}
								className="bg-red-600 hover:bg-red-700"
							>
								{isWithdrawPending ? "Withdrawing..." : "Confirm"}
							</Button>
							<Button size="sm" variant="outline" onClick={onHideWithdraw}>
								Cancel
							</Button>
						</div>
					) : (
						<Button
							variant="outline"
							onClick={onShowWithdraw}
							className="text-red-400 hover:bg-red-500/10"
							data-testid="emergency-withdraw-btn"
						>
							<AlertTriangle className="mr-1 h-4 w-4" /> Emergency Withdraw
						</Button>
					)}
				</div>
			</div>
		</Card>
	);
}
