"use client";

import { Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { ACCOUNT_TOKENS } from "@/lib/constants";
import { useCreateMultisig } from "../hooks/use-create-multisig";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface CreateMultisigFormProps {
	open: boolean;
	onClose: () => void;
	treasuryId: string;
	adminAddress: string;
}

interface TierInput {
	maxValue: string;
	requiredConfirmations: string;
}

export function CreateMultisigForm({
	open,
	onClose,
	treasuryId,
	adminAddress,
}: CreateMultisigFormProps) {
	const [name, setName] = useState("");
	const [tokenSymbol, setTokenSymbol] = useState<string>(
		ACCOUNT_TOKENS[0].name,
	);
	const [signers, setSigners] = useState<string[]>([""]);
	const [tiers, setTiers] = useState<TierInput[]>([
		{ maxValue: "10000", requiredConfirmations: "1" },
	]);
	const [defaultConfirmations, setDefaultConfirmations] = useState("3");
	const [allowlistEnabled, setAllowlistEnabled] = useState(false);
	const [error, setError] = useState("");

	const { step, ...createMutation } = useCreateMultisig();

	const totalSigners = signers.filter((s) => s.trim()).length + 1; // +1 for admin

	const stepLabels: Record<string, string> = {
		validating: "Validating...",
		"deploying-wallet": "Step 1/3: Deploying wallet...",
		"deploying-guard": "Step 2/3: Deploying guard...",
		"setting-guard": "Step 3/3: Setting guard...",
		finalizing: "Saving...",
	};

	function addSigner() {
		setSigners([...signers, ""]);
	}

	function removeSigner(index: number) {
		setSigners(signers.filter((_, i) => i !== index));
	}

	function updateSigner(index: number, value: string) {
		const updated = [...signers];
		updated[index] = value;
		setSigners(updated);
	}

	function addTier() {
		setTiers([...tiers, { maxValue: "", requiredConfirmations: "1" }]);
	}

	function removeTier(index: number) {
		setTiers(tiers.filter((_, i) => i !== index));
	}

	function updateTier(index: number, field: keyof TierInput, value: string) {
		const updated = [...tiers];
		updated[index] = { ...updated[index], [field]: value };
		setTiers(updated);
	}

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

		// Validate signers
		const validSigners = signers.map((s) => s.trim()).filter(Boolean);
		for (const s of validSigners) {
			if (!ADDRESS_RE.test(s)) {
				setError(`Invalid signer address: ${s.slice(0, 10)}...`);
				return;
			}
		}

		// Validate tiers
		const parsedDefaultConf = Number.parseInt(defaultConfirmations, 10);
		if (!parsedDefaultConf || parsedDefaultConf < 1) {
			setError("Default confirmations must be at least 1");
			return;
		}

		const parsedTiers = tiers
			.filter((t) => t.maxValue.trim())
			.map((t) => ({
				maxValue: BigInt(Math.round(Number(t.maxValue) * 1e6)).toString(),
				requiredConfirmations:
					Number.parseInt(t.requiredConfirmations, 10) || 1,
			}));

		for (const t of parsedTiers) {
			if (t.requiredConfirmations > totalSigners) {
				setError(
					`Required confirmations (${t.requiredConfirmations}) cannot exceed signer count (${totalSigners})`,
				);
				return;
			}
		}

		if (parsedDefaultConf > totalSigners) {
			setError(
				`Default confirmations (${parsedDefaultConf}) cannot exceed signer count (${totalSigners})`,
			);
			return;
		}

		const allOwners = [adminAddress, ...validSigners];

		createMutation.mutate(
			{
				treasuryId,
				name: name.trim(),
				tokenSymbol,
				owners: allOwners,
				tiers: parsedTiers,
				defaultConfirmations: parsedDefaultConf,
				allowlistEnabled,
				initialAllowlist: [],
			},
			{
				onSuccess: () => {
					setName("");
					setSigners([""]);
					setTiers([{ maxValue: "10000", requiredConfirmations: "1" }]);
					setDefaultConfirmations("3");
					setAllowlistEnabled(false);
					onClose();
				},
				onError: (err) => {
					setError(err.message);
				},
			},
		);
	}

	return (
		<Sheet open={open} onClose={onClose} title="Create Multisig Account">
			<div className="space-y-5">
				{/* Name */}
				<div>
					<label htmlFor="ms-name" className="mb-1 block text-sm font-medium">
						Account Name
					</label>
					<Input
						id="ms-name"
						placeholder="e.g., Treasury Operations"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>

				{/* Token */}
				<div>
					<label htmlFor="ms-token" className="mb-1 block text-sm font-medium">
						Token
					</label>
					<select
						id="ms-token"
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

				{/* Signers */}
				<div>
					<span className="mb-1 block text-sm font-medium">Signers</span>
					<p className="mb-2 text-xs text-gray-500">
						Your address is automatically included. Add additional signers
						below.
					</p>
					<div className="mb-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
						{adminAddress.slice(0, 6)}...{adminAddress.slice(-4)} (you)
					</div>
					{signers.map((signer, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: positional form inputs
						<div key={i} className="mb-2 flex gap-2">
							<Input
								placeholder="0x..."
								value={signer}
								onChange={(e) => updateSigner(i, e.target.value)}
								aria-label={`Signer ${i + 2} address`}
							/>
							{signers.length > 1 && (
								<button
									type="button"
									onClick={() => removeSigner(i)}
									className="rounded-md p-2 text-gray-400 hover:text-red-600"
									aria-label={`Remove signer ${i + 2}`}
								>
									<Trash2 className="h-4 w-4" />
								</button>
							)}
						</div>
					))}
					<button
						type="button"
						onClick={addSigner}
						className="text-sm text-blue-600 hover:text-blue-800"
					>
						+ Add signer
					</button>
				</div>

				{/* Approval Tiers */}
				<div>
					<span className="mb-1 block text-sm font-medium">
						Approval Thresholds
					</span>
					<p className="mb-2 text-xs text-gray-500">
						Define how many approvals are needed based on transfer amount.
					</p>
					{tiers.map((tier, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: positional form inputs
						<div key={i} className="mb-2 flex items-center gap-2">
							<span className="text-xs whitespace-nowrap text-gray-500">
								Up to $
							</span>
							<Input
								placeholder="10000"
								value={tier.maxValue}
								onChange={(e) => updateTier(i, "maxValue", e.target.value)}
								aria-label={`Tier ${i + 1} max value`}
								className="w-28"
							/>
							<span className="text-xs whitespace-nowrap text-gray-500">
								needs
							</span>
							<select
								value={tier.requiredConfirmations}
								onChange={(e) =>
									updateTier(i, "requiredConfirmations", e.target.value)
								}
								className="h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm"
								aria-label={`Tier ${i + 1} confirmations`}
							>
								{Array.from({ length: totalSigners }, (_, n) => {
									const val = n + 1;
									return (
										<option key={`conf-${val}`} value={val}>
											{val}/{totalSigners}
										</option>
									);
								})}
							</select>
							{tiers.length > 1 && (
								<button
									type="button"
									onClick={() => removeTier(i)}
									className="rounded-md p-1 text-gray-400 hover:text-red-600"
								>
									<Trash2 className="h-3 w-3" />
								</button>
							)}
						</div>
					))}
					<button
						type="button"
						onClick={addTier}
						className="mb-3 text-sm text-blue-600 hover:text-blue-800"
					>
						+ Add tier
					</button>
					<div className="flex items-center gap-2">
						<span className="text-xs text-gray-500">
							Above all tiers, require
						</span>
						<select
							value={defaultConfirmations}
							onChange={(e) => setDefaultConfirmations(e.target.value)}
							className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm"
							aria-label="Default confirmations"
						>
							{Array.from({ length: totalSigners }, (_, n) => {
								const val = n + 1;
								return (
									<option key={`def-${val}`} value={val}>
										{val}/{totalSigners}
									</option>
								);
							})}
						</select>
						<span className="text-xs text-gray-500">approvals</span>
					</div>
				</div>

				{/* Allowlist Toggle */}
				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						id="ms-allowlist"
						checked={allowlistEnabled}
						onChange={(e) => setAllowlistEnabled(e.target.checked)}
						className="h-4 w-4 rounded border-gray-300"
					/>
					<label htmlFor="ms-allowlist" className="text-sm">
						Enable address allowlist (restrict who can receive transfers)
					</label>
				</div>

				{/* Policy Preview */}
				<div
					data-testid="policy-preview"
					className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800"
				>
					<div className="mb-1 flex items-center gap-1 font-medium">
						<Shield className="h-3.5 w-3.5" />
						Policy Preview
					</div>
					{tiers
						.filter((t) => t.maxValue.trim())
						.map((t) => (
							<div key={`preview-${t.maxValue}`}>
								Transfers up to ${Number(t.maxValue).toLocaleString()}:{" "}
								{t.requiredConfirmations}/{totalSigners} approvals
							</div>
						))}
					<div>
						Above all tiers: {defaultConfirmations}/{totalSigners} approvals
					</div>
					{allowlistEnabled && (
						<div>Only allowlisted addresses can receive</div>
					)}
				</div>

				{error && <p className="text-sm text-red-600">{error}</p>}

				<Button
					onClick={handleSubmit}
					disabled={createMutation.isPending}
					className="w-full"
					size="lg"
				>
					<Shield className="h-4 w-4" />
					{createMutation.isPending
						? (stepLabels[step] ?? "Creating...")
						: "Create Multisig Account"}
				</Button>
			</div>
		</Sheet>
	);
}
