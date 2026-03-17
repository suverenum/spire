"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { updateTreasuryNameAction } from "@/domain/treasury/actions/treasury-actions";
import { SessionGuard } from "@/domain/auth/components/session-guard";

interface SettingsContentProps {
	treasuryName: string;
	authenticatedAt: number;
}

export function SettingsContent({
	treasuryName,
	authenticatedAt,
}: SettingsContentProps) {
	const [name, setName] = useState(treasuryName);
	const [isPending, startTransition] = useTransition();

	function handleSave() {
		const formData = new FormData();
		formData.set("name", name);
		startTransition(async () => {
			const result = await updateTreasuryNameAction(formData);
			if (result.error) {
				toast(result.error, "error");
			} else {
				toast("Treasury name updated", "success");
			}
		});
	}

	return (
		<SessionGuard authenticatedAt={authenticatedAt}>
			<div className="min-h-screen bg-gray-50">
				<header className="border-b border-gray-200 bg-white">
					<div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
						<Link
							href="/dashboard"
							className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
						>
							<ArrowLeft className="h-4 w-4" />
							Back
						</Link>
						<h1 className="text-xl font-semibold">Settings</h1>
					</div>
				</header>

				<main className="mx-auto max-w-4xl px-4 py-6">
					<Card>
						<h2 className="mb-4 text-lg font-semibold">Treasury Name</h2>
						<div className="flex gap-3">
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								maxLength={100}
							/>
							<Button
								onClick={handleSave}
								disabled={isPending || name === treasuryName}
							>
								{isPending ? "Saving..." : "Save"}
							</Button>
						</div>
					</Card>
				</main>
			</div>
		</SessionGuard>
	);
}
