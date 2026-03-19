"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { AccountWithBalance } from "@/lib/tempo/types";

interface AccountMenuProps {
	account: AccountWithBalance;
	onRename: () => void;
	onDelete: () => void;
}

export function AccountMenu({ account, onRename, onDelete }: AccountMenuProps) {
	const [open, setOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	if (account.isDefault) return null;

	return (
		<div className="relative" ref={menuRef}>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-muted-foreground"
				aria-label="Account actions"
			>
				<MoreHorizontal className="h-4 w-4" />
			</button>
			{open && (
				<>
					<button
						type="button"
						className="fixed inset-0 z-10"
						onClick={() => setOpen(false)}
						aria-label="Close menu"
					/>
					<div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-border bg-muted py-1 shadow-lg">
						{!account.isDefault && (
							<button
								type="button"
								onClick={() => {
									setOpen(false);
									onRename();
								}}
								className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-background"
							>
								<Pencil className="h-3.5 w-3.5" />
								Rename
							</button>
						)}
						{!account.isDefault && (
							<button
								type="button"
								onClick={() => {
									setOpen(false);
									onDelete();
								}}
								className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
							>
								<Trash2 className="h-3.5 w-3.5" />
								Delete
							</button>
						)}
					</div>
				</>
			)}
		</div>
	);
}
