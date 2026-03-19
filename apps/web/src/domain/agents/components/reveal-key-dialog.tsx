"use client";

import { Copy, Eye, EyeOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { revealAgentKey } from "../actions/reveal-agent-key";

interface RevealKeyDialogProps {
	walletId: string;
	onClose: () => void;
}

export function RevealKeyDialog({ walletId, onClose }: RevealKeyDialogProps) {
	const [privateKey, setPrivateKey] = useState<string | null>(null);
	const [showFull, setShowFull] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		revealAgentKey(walletId).then((result) => {
			setLoading(false);
			if (result.error) {
				setError(result.error);
			} else {
				setPrivateKey(result.privateKey ?? null);
			}
		});
	}, [walletId]);

	// Auto-hide after 30 seconds
	useEffect(() => {
		if (privateKey) {
			const timer = setTimeout(onClose, 30_000);
			return () => clearTimeout(timer);
		}
	}, [privateKey, onClose]);

	const maskedKey = privateKey ? `${privateKey.slice(0, 10)}${"•".repeat(54)}` : "";

	const handleCopy = async () => {
		if (privateKey) {
			await navigator.clipboard.writeText(privateKey);
			toast("Key copied to clipboard", "success");
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			data-testid="reveal-key-dialog"
		>
			<div className="bg-card border-border w-full max-w-md rounded-lg border p-6 shadow-xl">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-lg font-semibold">Agent Private Key</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-muted-foreground hover:text-foreground"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{loading && <p className="text-muted-foreground text-sm">Decrypting key...</p>}
				{error && <p className="text-sm text-red-400">{error}</p>}

				{privateKey && (
					<>
						<div className="bg-muted mb-3 rounded p-3 font-mono text-xs break-all">
							{showFull ? privateKey : maskedKey}
						</div>

						<div className="flex gap-2">
							<Button variant="outline" size="sm" onClick={() => setShowFull(!showFull)}>
								{showFull ? (
									<>
										<EyeOff className="mr-1 h-3 w-3" /> Hide
									</>
								) : (
									<>
										<Eye className="mr-1 h-3 w-3" /> Show full key
									</>
								)}
							</Button>
							<Button variant="outline" size="sm" onClick={handleCopy}>
								<Copy className="mr-1 h-3 w-3" /> Copy
							</Button>
						</div>

						<p className="mt-3 text-xs text-amber-400">
							Auto-hides in 30 seconds. Keep this key secure.
						</p>
					</>
				)}
			</div>
		</div>
	);
}
