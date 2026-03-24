"use client";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { CREATE_ACCOUNT_UNAVAILABLE_ERROR } from "../hooks/use-create-account";

interface CreateAccountFormProps {
	open: boolean;
	onClose: () => void;
	treasuryId: string;
}

export function CreateAccountForm({
	open,
	onClose,
	treasuryId: _treasuryId,
}: CreateAccountFormProps) {
	void _treasuryId;

	return (
		<Sheet open={open} onClose={onClose} title="Create Account">
			<div className="space-y-4">
				<p className="text-muted-foreground text-sm">
					{CREATE_ACCOUNT_UNAVAILABLE_ERROR}. Existing smart accounts remain view-only until
					spending support is completed.
				</p>
				<Button onClick={onClose} className="w-full" size="lg" variant="outline">
					Close
				</Button>
			</div>
		</Sheet>
	);
}
