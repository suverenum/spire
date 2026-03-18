"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import type { AccountWithBalance } from "@/lib/tempo/types";
import { renameAccountAction } from "../actions/rename-account";

interface RenameDialogProps {
	open: boolean;
	onClose: () => void;
	account: AccountWithBalance | null;
	onSuccess: () => void;
}

export function RenameDialog({ open, onClose, account, onSuccess }: RenameDialogProps) {
	const [name, setName] = useState(account?.name ?? "");
	const [error, setError] = useState("");
	const [isPending, setIsPending] = useState(false);

	// Sync name when dialog opens or account changes
	useEffect(() => {
		if (open && account) {
			setName(account.name);
		}
	}, [open, account]);

	async function handleSubmit() {
		setError("");

		if (!name.trim()) {
			setError("Account name is required");
			return;
		}

		if (!account) return;

		setIsPending(true);
		try {
			const formData = new FormData();
			formData.set("accountId", account.id);
			formData.set("name", name.trim());

			const result = await renameAccountAction(formData);
			if (result.error) {
				setError(result.error);
			} else {
				toast("Account renamed!", "success");
				setName("");
				onSuccess();
				onClose();
			}
		} finally {
			setIsPending(false);
		}
	}

	return (
		<Sheet open={open} onClose={onClose} title="Rename Account">
			<div className="space-y-4">
				<div>
					<label htmlFor="rename-name" className="mb-1 block text-sm font-medium">
						New Name
					</label>
					<Input id="rename-name" value={name} onChange={(e) => setName(e.target.value)} />
				</div>

				{error && <p className="text-sm text-red-600">{error}</p>}

				<Button onClick={handleSubmit} disabled={isPending} className="w-full" size="lg">
					{isPending ? "Renaming..." : "Rename"}
				</Button>
			</div>
		</Sheet>
	);
}
