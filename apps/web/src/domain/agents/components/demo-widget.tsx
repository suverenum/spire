"use client";

import { Bot, ExternalLink, Image as ImageIcon, Loader2 } from "lucide-react";
import NextImage from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TEMPO_EXPLORER_URL } from "@/lib/constants";

interface DemoResult {
	imageUrl?: string;
	txHash?: string;
	amount?: string;
	vendor?: string;
	error?: string;
}

/**
 * Interactive demo widget: paste an agent key + prompt,
 * calls a backend demo endpoint that uses createGuardedMppx to generate an image.
 *
 * For the hackathon, this calls /api/agents/demo which:
 * 1. Creates a guarded mppx client with the provided key
 * 2. Makes a request to a Stability AI MPP endpoint
 * 3. Returns the generated image + payment receipt
 */
export function DemoWidget() {
	const [agentKey, setAgentKey] = useState("");
	const [guardianAddress, setGuardianAddress] = useState("");
	const [prompt, setPrompt] = useState("A futuristic city on the Tempo blockchain");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<DemoResult | null>(null);

	const handleGenerate = async () => {
		if (!agentKey || !guardianAddress) return;

		setLoading(true);
		setResult(null);

		try {
			const res = await fetch("/api/agents/demo", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ agentKey, guardianAddress, prompt }),
			});

			const data = await res.json();
			if (!res.ok) {
				setResult({ error: data.error || "Demo failed" });
			} else {
				setResult(data);
			}
		} catch (err) {
			setResult({ error: err instanceof Error ? err.message : "Network error" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="border-border bg-card rounded-lg border p-6" data-testid="demo-widget">
			<h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
				<Bot className="h-5 w-5 text-emerald-400" />
				Try it live
			</h3>

			<div className="space-y-3">
				<div>
					<label
						htmlFor="demo-key"
						className="text-muted-foreground mb-1 block text-xs font-medium"
					>
						Agent Private Key
					</label>
					<Input
						id="demo-key"
						type="password"
						placeholder="0x..."
						value={agentKey}
						onChange={(e) => setAgentKey(e.target.value)}
						disabled={loading}
					/>
				</div>

				<div>
					<label
						htmlFor="demo-guardian"
						className="text-muted-foreground mb-1 block text-xs font-medium"
					>
						Guardian Address
					</label>
					<Input
						id="demo-guardian"
						placeholder="0x..."
						value={guardianAddress}
						onChange={(e) => setGuardianAddress(e.target.value)}
						disabled={loading}
					/>
				</div>

				<div>
					<label
						htmlFor="demo-prompt"
						className="text-muted-foreground mb-1 block text-xs font-medium"
					>
						Image Prompt
					</label>
					<Input
						id="demo-prompt"
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						disabled={loading}
					/>
				</div>

				<Button
					onClick={handleGenerate}
					disabled={loading || !agentKey || !guardianAddress}
					className="w-full"
				>
					{loading ? (
						<>
							<Loader2 className="mr-1 h-4 w-4 animate-spin" /> Generating...
						</>
					) : (
						<>
							<ImageIcon className="mr-1 h-4 w-4" /> Generate Image via MPP
						</>
					)}
				</Button>
			</div>

			{result && (
				<div className="border-border mt-4 space-y-3 border-t pt-4">
					{result.error ? (
						<div className="rounded bg-red-500/10 p-3 text-sm text-red-400">{result.error}</div>
					) : (
						<>
							{result.imageUrl && (
								<NextImage
									src={result.imageUrl}
									alt="Generated"
									width={512}
									height={512}
									className="w-full rounded-lg"
									unoptimized
								/>
							)}

							{result.txHash && (
								<div className="rounded bg-emerald-500/10 p-3">
									<p className="text-xs text-emerald-400">Payment receipt</p>
									<div className="mt-1 flex items-center gap-2">
										<span className="font-mono text-sm">{result.txHash.slice(0, 18)}...</span>
										<a
											href={`${TEMPO_EXPLORER_URL}/tx/${result.txHash}`}
											target="_blank"
											rel="noopener noreferrer"
											className="text-blue-600 hover:underline"
										>
											<ExternalLink className="h-3 w-3" />
										</a>
									</div>
									{result.amount && (
										<p className="text-muted-foreground mt-1 text-xs">
											Paid ${result.amount} to {result.vendor}
										</p>
									)}
								</div>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}
