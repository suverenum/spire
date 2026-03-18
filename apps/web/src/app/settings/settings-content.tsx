"use client";

import { useState, useTransition } from "react";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { SessionGuard } from "@/domain/auth/components/session-guard";
import { updateTreasuryNameAction } from "@/domain/treasury/actions/treasury-actions";

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
			<SidebarLayout treasuryName={treasuryName}>
				<h1 className="mb-6 text-2xl font-semibold">Settings</h1>
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
			</SidebarLayout>
		</SessionGuard>
	);
}
