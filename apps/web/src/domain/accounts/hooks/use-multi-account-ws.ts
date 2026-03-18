"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { toast } from "@/components/ui/toast";
import { CACHE_KEYS, SUPPORTED_TOKENS, TEMPO_WS_URL } from "@/lib/constants";
import { AnalyticsEvents, trackEvent } from "@/lib/posthog";
import type { AccountRecord } from "@/lib/tempo/types";

const TRANSFER_TOPIC =
	"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const POLLING_INTERVAL = 15_000;
const TOAST_DEBOUNCE_MS = 2_000;

let wsConnected = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot() {
	return wsConnected;
}

function getServerSnapshot() {
	return false;
}

function setConnected(value: boolean) {
	if (wsConnected !== value) {
		wsConnected = value;
		for (const l of listeners) l();
	}
}

export function useMultiAccountWs(accounts: AccountRecord[]) {
	const queryClient = useQueryClient();
	const wsRef = useRef<WebSocket | null>(null);
	const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const isConnected = useSyncExternalStore(
		subscribe,
		getSnapshot,
		getServerSnapshot,
	);

	// Stabilize the accounts dependency to avoid reconnect loops on every render
	const accountsRef = useRef(accounts);
	accountsRef.current = accounts;
	const accountAddresses = useMemo(
		() =>
			accounts
				.map((a) => a.walletAddress.toLowerCase())
				.sort()
				.join(","),
		[accounts],
	);

	useEffect(() => {
		if (!accountAddresses) return;

		const currentAccounts = accountsRef.current;
		let cleaned = false;
		let toastTimer: ReturnType<typeof setTimeout> | null = null;

		const invalidateData = () => {
			for (const account of accountsRef.current) {
				void queryClient.invalidateQueries({
					queryKey: CACHE_KEYS.accountBalance(
						account.walletAddress,
						account.tokenAddress,
					),
				});
				void queryClient.invalidateQueries({
					queryKey: CACHE_KEYS.transactions(account.walletAddress),
				});
			}
		};

		const debouncedToast = () => {
			if (toastTimer) return;
			toast("Transfer detected!", "success");
			toastTimer = setTimeout(() => {
				toastTimer = null;
			}, TOAST_DEBOUNCE_MS);
		};

		const startPolling = () => {
			if (cleaned || pollingRef.current) return;
			pollingRef.current = setInterval(invalidateData, POLLING_INTERVAL);
		};

		const stopPolling = () => {
			if (pollingRef.current) {
				clearInterval(pollingRef.current);
				pollingRef.current = null;
			}
		};

		const walletAddresses = currentAccounts.map((a) => a.walletAddress);
		const tokenAddresses = Object.values(SUPPORTED_TOKENS).map(
			(t) => t.address,
		);

		try {
			const ws = new WebSocket(TEMPO_WS_URL);
			wsRef.current = ws;

			ws.onopen = () => {
				if (cleaned) return;
				setConnected(true);
				stopPolling();
				// Subscribe to Transfer events for all account wallets (both incoming and outgoing)
				for (const addr of walletAddresses) {
					const paddedAddr = `0x000000000000000000000000${addr.slice(2).toLowerCase()}`;
					// Incoming transfers (account is the recipient)
					ws.send(
						JSON.stringify({
							jsonrpc: "2.0",
							id: 1,
							method: "eth_subscribe",
							params: [
								"logs",
								{
									address: tokenAddresses,
									topics: [TRANSFER_TOPIC, null, paddedAddr],
								},
							],
						}),
					);
					// Outgoing transfers (account is the sender)
					ws.send(
						JSON.stringify({
							jsonrpc: "2.0",
							id: 2,
							method: "eth_subscribe",
							params: [
								"logs",
								{
									address: tokenAddresses,
									topics: [TRANSFER_TOPIC, paddedAddr, null],
								},
							],
						}),
					);
				}
			};

			ws.onmessage = (event) => {
				if (cleaned) return;
				try {
					const data = JSON.parse(event.data);
					if (data.method === "eth_subscription") {
						invalidateData();
						debouncedToast();
						// Determine direction from log topics to track the correct analytics event
						const topics = data.params?.result?.topics;
						if (Array.isArray(topics) && topics.length >= 3) {
							const toAddress = `0x${(topics[2] as string).slice(26).toLowerCase()}`;
							const addrs = walletAddresses.map((a) => a.toLowerCase());
							if (addrs.includes(toAddress)) {
								trackEvent(AnalyticsEvents.PAYMENT_RECEIVED);
							}
						}
					}
				} catch {
					// Ignore malformed messages
				}
			};

			ws.onclose = () => {
				if (cleaned) return;
				setConnected(false);
				startPolling();
			};

			ws.onerror = () => {
				if (cleaned) return;
				setConnected(false);
				startPolling();
			};
		} catch {
			setConnected(false);
			startPolling();
		}

		return () => {
			cleaned = true;
			wsRef.current?.close();
			wsRef.current = null;
			stopPolling();
			if (toastTimer) clearTimeout(toastTimer);
		};
	}, [accountAddresses, queryClient]);

	return { isConnected };
}
