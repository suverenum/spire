"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

interface SidebarLayoutProps {
	treasuryName: string;
	children: ReactNode;
}

export function SidebarLayout({ treasuryName, children }: SidebarLayoutProps) {
	return (
		<div className="bg-background min-h-screen">
			<Sidebar treasuryName={treasuryName} />
			<main className="lg:pl-56">
				<div className="mx-auto max-w-5xl px-4 py-6 pt-16 lg:pt-6">{children}</div>
			</main>
		</div>
	);
}
