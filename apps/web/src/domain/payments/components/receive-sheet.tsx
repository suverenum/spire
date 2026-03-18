"use client";

import { Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { formatBalance } from "@/lib/utils";

interface ReceiveSheetProps {
	open: boolean;
	onClose: () => void;
	address: `0x${string}`;
	accounts?: AccountWithBalance[];
	selectedAccountId?: string;
	onAccountChange?: (accountId: string) => void;
}

export function ReceiveSheet({
	open,
	onClose,
	address,
	accounts,
	selectedAccountId,
	onAccountChange,
}: ReceiveSheetProps) {
	const selectedAccount = accounts?.find((a) => a.id === selectedAccountId);
	const displayAddress = selectedAccount
		? (selectedAccount.walletAddress as `0x${string}`)
		: address;

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(displayAddress);
			toast("Address copied!", "success");
		} catch {
			toast("Failed to copy", "error");
		}
	}

	return (
		<Sheet open={open} onClose={onClose} title="Receive Payment">
			<div className="flex flex-col items-center gap-6">
				{accounts && accounts.length > 0 && (
					<div className="w-full">
						<label
							htmlFor="receive-account"
							className="mb-1 block text-sm font-medium"
						>
							Receive to Account
						</label>
						<select
							id="receive-account"
							value={selectedAccountId ?? ""}
							onChange={(e) => onAccountChange?.(e.target.value)}
							className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
						>
							{accounts.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name} ({a.tokenSymbol}) - ${formatBalance(a.balance, 6)}
								</option>
							))}
						</select>
					</div>
				)}

				<div className="rounded-xl border border-gray-200 bg-white p-4">
					<QRCodeSVG value={displayAddress} size={200} level="M" />
				</div>
				<div className="w-full">
					<p className="mb-1 text-center text-sm text-gray-500">
						{selectedAccount
							? `${selectedAccount.name} wallet address`
							: "Your wallet address"}
					</p>
					<div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
						<code className="min-w-0 flex-1 truncate text-xs">
							{displayAddress}
						</code>
						<Button variant="ghost" size="icon" onClick={handleCopy}>
							<Copy className="h-4 w-4" />
						</Button>
					</div>
				</div>
				<p className="text-center text-xs text-gray-400">
					{selectedAccount
						? `Share this address to receive ${selectedAccount.tokenSymbol} payments on Tempo.`
						: "Share this address or QR code to receive stablecoin payments on Tempo."}
				</p>
			</div>
		</Sheet>
	);
}
