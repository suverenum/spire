"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

interface SidebarLayoutProps {
	treasuryName: string;
	children: ReactNode;
}

export function SidebarLayout({ treasuryName, children }: SidebarLayoutProps) {
	return (
		<div className="min-h-screen bg-gray-50">
			<Sidebar treasuryName={treasuryName} />
			<main className="lg:pl-64">
				<div className="mx-auto max-w-5xl px-4 py-6 pt-16 lg:pt-6">{children}</div>
			</main>
		</div>
	);
}
