"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CACHE_KEYS, SUPPORTED_TOKENS, TEMPO_WS_URL } from "@/lib/constants";
import { toast } from "@/components/ui/toast";
import { trackEvent, AnalyticsEvents } from "@/lib/posthog";

// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC =
	"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const POLLING_INTERVAL = 15_000;

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
		listeners.forEach((l) => l());
	}
}

export function useIncomingPayments(address: `0x${string}` | undefined) {
	const queryClient = useQueryClient();
	const wsRef = useRef<WebSocket | null>(null);
	const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const isConnected = useSyncExternalStore(
		subscribe,
		getSnapshot,
		getServerSnapshot,
	);

	useEffect(() => {
		if (!address) return;

		let cleaned = false;

		const invalidateData = () => {
			void queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.balances(address),
			});
			void queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.transactions(address),
			});
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

		try {
			const ws = new WebSocket(TEMPO_WS_URL);
			wsRef.current = ws;

			ws.onopen = () => {
				if (cleaned) return;
				setConnected(true);
				stopPolling();
				ws.send(
					JSON.stringify({
						jsonrpc: "2.0",
						id: 1,
						method: "eth_subscribe",
						params: [
							"logs",
							{
								address: Object.values(SUPPORTED_TOKENS).map((t) => t.address),
								topics: [
									TRANSFER_TOPIC,
									null,
									`0x000000000000000000000000${address.slice(2).toLowerCase()}`,
								],
							},
						],
					}),
				);
			};

			ws.onmessage = (event) => {
				if (cleaned) return;
				try {
					const data = JSON.parse(event.data);
					if (data.method === "eth_subscription") {
						invalidateData();
						toast("Payment received!", "success");
						trackEvent(AnalyticsEvents.PAYMENT_RECEIVED);
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
		};
	}, [address, queryClient]);

	return { isConnected };
}
