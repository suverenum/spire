"use client";

import { Bot, Code, Copy, Lock, Shield, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { VENDOR_LIST } from "@/lib/vendors";
import { AGENT_CODE_SNIPPET } from "../utils/code-snippet";

export function AgentBankLanding({ onGetStarted }: { onGetStarted: () => void }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(AGENT_CODE_SNIPPET);
		setCopied(true);
		toast("Code copied!", "success");
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
			{/* Hero */}
			<section className="mx-auto max-w-4xl px-6 py-20 text-center">
				<div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700">
					<Bot className="h-4 w-4" />
					On-chain guardrails for AI agents
				</div>
				<h1 className="text-5xl font-bold tracking-tight text-gray-900">Bank for your AI Agents</h1>
				<p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
					Create wallets for your AI agents with spending limits, vendor allowlists, and
					per-transaction caps — all enforced on-chain by Guardian smart contracts. Not
					application-level. Not SDK-level. Cryptographically enforced.
				</p>
				<div className="mt-8 flex justify-center gap-4">
					<Button onClick={onGetStarted} size="lg" data-testid="hero-cta">
						Create Agent Treasury
					</Button>
					<Button
						variant="outline"
						size="lg"
						onClick={() =>
							document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
						}
					>
						How it works
					</Button>
				</div>
			</section>

			{/* How it works */}
			<section id="how-it-works" className="mx-auto max-w-4xl px-6 py-16">
				<h2 className="mb-12 text-center text-3xl font-bold text-gray-900">How it works</h2>
				<div className="grid grid-cols-1 gap-8 md:grid-cols-3">
					{[
						{
							icon: Shield,
							title: "1. Create Guardian",
							desc: "Deploy a Guardian smart contract with your spending rules. Daily limits, per-tx caps, vendor allowlists — all on-chain.",
						},
						{
							icon: Lock,
							title: "2. Fund & Configure",
							desc: "Transfer stablecoins to the Guardian. Add allowed vendors. The agent's key can only spend within your rules.",
						},
						{
							icon: Zap,
							title: "3. Agent Pays via MPP",
							desc: "Your agent uses standard MPP to pay for services. The Guardian intercepts every payment and enforces rules before releasing funds.",
						},
					].map(({ icon: Icon, title, desc }) => (
						<div key={title} className="rounded-lg border border-gray-200 p-6 text-center">
							<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
								<Icon className="h-6 w-6" />
							</div>
							<h3 className="mb-2 text-lg font-semibold">{title}</h3>
							<p className="text-sm text-gray-600">{desc}</p>
						</div>
					))}
				</div>
			</section>

			{/* Why on-chain */}
			<section className="bg-gray-50 px-6 py-16">
				<div className="mx-auto max-w-4xl">
					<h2 className="mb-8 text-center text-3xl font-bold text-gray-900">
						Why on-chain matters
					</h2>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-gray-200 text-left">
									<th className="px-4 py-3 font-medium">Approach</th>
									<th className="px-4 py-3 font-medium">Enforcement</th>
									<th className="px-4 py-3 font-medium">Tamper-proof?</th>
									<th className="px-4 py-3 font-medium">Works if agent compromised?</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-gray-100">
									<td className="px-4 py-3">App-level checks</td>
									<td className="px-4 py-3 text-gray-500">Your backend</td>
									<td className="px-4 py-3 text-red-600">No</td>
									<td className="px-4 py-3 text-red-600">No</td>
								</tr>
								<tr className="border-b border-gray-100">
									<td className="px-4 py-3">SDK-level checks</td>
									<td className="px-4 py-3 text-gray-500">Agent process</td>
									<td className="px-4 py-3 text-red-600">No</td>
									<td className="px-4 py-3 text-red-600">No</td>
								</tr>
								<tr className="bg-emerald-50">
									<td className="px-4 py-3 font-medium text-emerald-800">Guardian contract</td>
									<td className="px-4 py-3 font-medium text-emerald-800">Blockchain</td>
									<td className="px-4 py-3 font-medium text-emerald-600">Yes</td>
									<td className="px-4 py-3 font-medium text-emerald-600">Yes</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</section>

			{/* Supported vendors */}
			<section className="mx-auto max-w-4xl px-6 py-16">
				<h2 className="mb-8 text-center text-3xl font-bold text-gray-900">Supported AI vendors</h2>
				<div className="grid grid-cols-2 gap-4 md:grid-cols-5">
					{VENDOR_LIST.map((vendor) => (
						<div
							key={vendor.id}
							className="flex flex-col items-center rounded-lg border border-gray-200 p-4 text-center"
						>
							<span className="text-lg font-semibold">{vendor.name}</span>
							<span className="mt-1 text-xs text-gray-500">{vendor.description}</span>
						</div>
					))}
				</div>
			</section>

			{/* Code snippet */}
			<section className="bg-gray-900 px-6 py-16 text-white">
				<div className="mx-auto max-w-3xl">
					<div className="mb-6 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Code className="h-5 w-5 text-emerald-400" />
							<h2 className="text-2xl font-bold">Integration in minutes</h2>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={handleCopy}
							className="border-gray-600 text-gray-300 hover:bg-gray-800"
						>
							<Copy className="mr-1 h-3 w-3" />
							{copied ? "Copied!" : "Copy"}
						</Button>
					</div>
					<pre className="overflow-x-auto rounded-lg bg-gray-800 p-4 text-sm leading-relaxed">
						<code>{AGENT_CODE_SNIPPET}</code>
					</pre>
				</div>
			</section>

			{/* CTA */}
			<section className="mx-auto max-w-4xl px-6 py-20 text-center">
				<h2 className="text-3xl font-bold text-gray-900">Ready to secure your agents?</h2>
				<p className="mt-3 text-gray-600">On-chain guardrails for the agentic economy.</p>
				<Button onClick={onGetStarted} size="lg" className="mt-6" data-testid="bottom-cta">
					Get Started
				</Button>
			</section>
		</div>
	);
}
