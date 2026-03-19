"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOutIcon, SettingsIcon } from "@/components/icons";
import { clearPersistedCache } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { logoutAction } from "@/domain/auth/actions/auth-actions";
import { AnalyticsEvents, trackEvent } from "@/lib/posthog";
import { truncateAddress } from "@/lib/utils";

interface TreasuryHeaderProps {
	name: string;
	address: `0x${string}`;
}

export function TreasuryHeader({ name, address }: TreasuryHeaderProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	async function handleCopyAddress() {
		try {
			await navigator.clipboard.writeText(address);
			toast("Address copied!", "success");
		} catch {
			toast("Failed to copy address", "error");
		}
	}

	async function handleLogout() {
		setIsLoggingOut(true);
		trackEvent(AnalyticsEvents.LOGOUT);
		queryClient.clear();
		await clearPersistedCache();
		try {
			await logoutAction();
		} catch {
			// redirect throws
		}
	}

	return (
		<header className="border-b border-border bg-muted">
			<div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
				<div>
					<h1 className="text-xl font-semibold">{name}</h1>
					<button
						type="button"
						onClick={handleCopyAddress}
						className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
					>
						{truncateAddress(address)}
						<Copy className="h-3 w-3" />
					</button>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.push("/settings")}
						aria-label="Settings"
					>
						<SettingsIcon className="h-5 w-5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleLogout}
						disabled={isLoggingOut}
						aria-label="Logout"
					>
						<LogOutIcon className="h-5 w-5" />
					</Button>
				</div>
			</div>
		</header>
	);
}
