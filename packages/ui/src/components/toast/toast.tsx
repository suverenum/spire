"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "../../cn";

interface Toast {
	id: string;
	message: string;
	type: "success" | "error" | "info";
}

let addToastFn: ((toast: Omit<Toast, "id">) => void) | null = null;

export function toast(message: string, type: Toast["type"] = "info") {
	addToastFn?.({ message, type });
}

export function Toaster() {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const addToast = useCallback((t: Omit<Toast, "id">) => {
		const id = Math.random().toString(36).slice(2);
		setToasts((prev) => [...prev, { ...t, id }]);
		setTimeout(() => {
			setToasts((prev) => prev.filter((toast) => toast.id !== id));
		}, 4000);
	}, []);

	useEffect(() => {
		addToastFn = addToast;
		return () => {
			addToastFn = null;
		};
	}, [addToast]);

	const dismiss = (id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	};

	return (
		<div className="fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
			{toasts.map((t) => (
				<div
					key={t.id}
					role="alert"
					className={cn(
						"flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg",
						t.type === "success" && "bg-success text-white",
						t.type === "error" && "bg-error text-white",
						t.type === "info" && "bg-muted text-foreground border-border border",
					)}
				>
					<span>{t.message}</span>
					<button
						type="button"
						onClick={() => dismiss(t.id)}
						className="ml-2 opacity-70 hover:opacity-100"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			))}
		</div>
	);
}
