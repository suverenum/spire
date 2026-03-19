"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SheetProps {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
	title?: string;
}

export function Sheet({ open, onClose, children, title }: SheetProps) {
	const overlayRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (open) {
			document.body.style.overflow = "hidden";
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") onClose();
			};
			document.addEventListener("keydown", handleKeyDown);
			return () => {
				document.body.style.overflow = "";
				document.removeEventListener("keydown", handleKeyDown);
			};
		} else {
			document.body.style.overflow = "";
		}
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div
			ref={overlayRef}
			className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
			onClick={(e) => {
				if (e.target === overlayRef.current) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			<div
				className={cn(
					"border-border bg-muted w-full max-w-lg rounded-t-xl border p-6 shadow-xl sm:rounded-xl",
					"animate-in slide-in-from-bottom duration-200",
				)}
			>
				<div className="mb-4 flex items-center justify-between">
					{title && <h2 className="text-lg font-semibold">{title}</h2>}
					<button
						type="button"
						onClick={onClose}
						className="hover:bg-accent ml-auto cursor-pointer rounded-md p-1"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				{children}
			</div>
		</div>
	);
}
