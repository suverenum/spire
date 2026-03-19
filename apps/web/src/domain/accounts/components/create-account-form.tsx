"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { ACCOUNT_TOKENS } from "@/lib/constants";
import { useCreateAccount } from "../hooks/use-create-account";

interface CreateAccountFormProps {
	open: boolean;
	onClose: () => void;
	treasuryId: string;
}

export function CreateAccountForm({ open, onClose, treasuryId }: CreateAccountFormProps) {
	const [name, setName] = useState("");
	const [tokenSymbol, setTokenSymbol] = useState<string>(ACCOUNT_TOKENS[0].name);
	const [error, setError] = useState("");

	const createMutation = useCreateAccount();

	function handleSubmit() {
		setError("");

		if (!name.trim()) {
			setError("Account name is required");
			return;
		}

		if (name.length > 100) {
			setError("Account name must be 100 characters or less");
			return;
		}

		createMutation.mutate(
			{ treasuryId, tokenSymbol, name: name.trim() },
			{
				onSuccess: () => {
					setName("");
					setTokenSymbol(ACCOUNT_TOKENS[0].name);
					onClose();
				},
				onError: (err) => {
					setError(err.message);
				},
			},
		);
	}

	return (
		<Sheet open={open} onClose={onClose} title="Create Account">
			<div className="space-y-4">
				<div>
					<label htmlFor="account-name" className="mb-1 block text-sm font-medium">
						Account Name
					</label>
					<Input
						id="account-name"
						placeholder="e.g., Operations AlphaUSD"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>

				{ACCOUNT_TOKENS.length > 1 ? (
					<div>
						<label htmlFor="account-token" className="mb-1 block text-sm font-medium">
							Token
						</label>
						<select
							id="account-token"
							value={tokenSymbol}
							onChange={(e) => setTokenSymbol(e.target.value)}
							className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
						>
							{ACCOUNT_TOKENS.map((t) => (
								<option key={t.name} value={t.name}>
									{t.name}
								</option>
							))}
						</select>
					</div>
				) : (
					<p className="text-sm text-gray-500">Token: {ACCOUNT_TOKENS[0].name}</p>
				)}

				{error && <p className="text-sm text-red-600">{error}</p>}

				<Button
					onClick={handleSubmit}
					disabled={createMutation.isPending}
					className="w-full"
					size="lg"
				>
					<Plus className="h-4 w-4" />
					{createMutation.isPending ? "Creating..." : "Create Account"}
				</Button>
			</div>
		</Sheet>
	);
}
