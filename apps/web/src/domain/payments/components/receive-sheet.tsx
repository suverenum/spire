"use client";

import { Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { BridgeTrackForm } from "@/domain/bridge/components/bridge-track-form";
import { type ChainId, ChainSelector } from "@/domain/bridge/components/chain-selector";
import { StargateDeposit } from "@/domain/bridge/components/stargate-deposit";
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
	const [selectedChain, setSelectedChain] = useState<ChainId>("tempo");

	const selectedAccount =
		accounts?.find((a) => a.id === selectedAccountId) ??
		(accounts?.length === 1 ? accounts[0] : undefined);
	const effectiveAccountId = selectedAccount?.id ?? selectedAccountId;
	const displayAddress = selectedAccount
		? (selectedAccount.walletAddress as `0x${string}`)
		: address;
	const isUsdcAccount = selectedAccount?.tokenSymbol === "USDC";

	// Reset chain to tempo when switching to a non-USDC account
	useEffect(() => {
		if (!isUsdcAccount && selectedChain !== "tempo") {
			setSelectedChain("tempo");
		}
	}, [isUsdcAccount, selectedChain]);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(displayAddress);
			toast("Address copied!", "success");
		} catch {
			toast("Failed to copy", "error");
		}
	}

	return (
		<Sheet open={open} onClose={onClose} title="Deposit">
			<div className="flex flex-col items-center gap-6">
				{accounts && accounts.length > 1 && (
					<div className="w-full">
						<label htmlFor="receive-account" className="mb-1 block text-sm font-medium">
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
									{a.name} ({a.tokenSymbol}) - {formatBalance(a.balance, 6)}
								</option>
							))}
						</select>
					</div>
				)}

				<ChainSelector
					value={selectedChain}
					onChange={setSelectedChain}
					enableExternalChains={isUsdcAccount}
				/>

				{selectedChain === "tempo" ? (
					<>
						<div className="rounded-xl border border-gray-200 bg-white p-4">
							<QRCodeSVG value={displayAddress} size={200} level="M" />
						</div>
						<div className="w-full">
							<p className="mb-1 text-center text-sm text-gray-500">
								{selectedAccount ? `${selectedAccount.name} wallet address` : "Your wallet address"}
							</p>
							<div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
								<code className="min-w-0 flex-1 truncate text-xs">{displayAddress}</code>
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
					</>
				) : (
					<div className="w-full">
						<StargateDeposit chain={selectedChain} destAddress={displayAddress} />
						{effectiveAccountId && (
							<div className="mt-4">
								<BridgeTrackForm accountId={effectiveAccountId} sourceChain={selectedChain} />
							</div>
						)}
					</div>
				)}
			</div>
		</Sheet>
	);
}
