"use client";

import { Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfig, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTreasuryAction } from "@/domain/treasury/actions/treasury-actions";
import { AnalyticsEvents, trackEvent } from "@/lib/posthog";

export default function CreateTreasuryPage() {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const config = useConfig();
	const { connectAsync, connectors } = useConnect();
	const { disconnectAsync } = useDisconnect();

	function handleSubmit(formData: FormData) {
		setError(null);
		startTransition(async () => {
			try {
				if (!connectors[0]) {
					setError("Passkey authentication is not available in this browser");
					return;
				}
				// Clear all stale wagmi state so sign-up creates a fresh credential
				await disconnectAsync().catch(() => {});
				await config.storage?.removeItem("webAuthn.lastActiveCredential");
				await config.storage?.removeItem("webAuthn.activeCredential");
				const result = await connectAsync({
					connector: connectors[0],
					capabilities: { type: "sign-up" },
				} as Parameters<typeof connectAsync>[0]);
				const account = result.accounts[0];
				if (!account) {
					setError("No account returned from passkey");
					return;
				}
				const address = typeof account === "string" ? account : account.address;

				formData.set("tempoAddress", address);
				const actionResult = await createTreasuryAction(formData);
				if (actionResult?.error) {
					setError(actionResult.error);
				} else {
					trackEvent(AnalyticsEvents.TREASURY_CREATED);
					router.push("/dashboard");
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Passkey creation failed");
			}
		});
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="w-full max-w-sm">
				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-900">
						<Fingerprint className="h-8 w-8 text-white" />
					</div>
					<h1 className="text-2xl font-semibold">Create Treasury</h1>
					<p className="mt-1 text-sm text-gray-500">Choose a name and create your passkey</p>
				</div>

				<form action={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="treasury-name" className="mb-1 block text-sm font-medium">
							Treasury Name
						</label>
						<Input
							id="treasury-name"
							name="name"
							placeholder="My Treasury"
							required
							maxLength={100}
						/>
					</div>

					{error && (
						<p className="text-sm text-red-600" role="alert">
							{error}
						</p>
					)}

					<Button type="submit" disabled={isPending} className="w-full" size="lg">
						<Fingerprint className="h-5 w-5" />
						{isPending ? "Creating..." : "Create with Passkey"}
					</Button>
				</form>
			</div>
		</div>
	);
}
