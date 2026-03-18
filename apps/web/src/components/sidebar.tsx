"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeftRight,
	LayoutDashboard,
	LogOut,
	Menu,
	Receipt,
	Settings,
	Wallet,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { clearPersistedCache } from "@/components/providers";
import { logoutAction } from "@/domain/auth/actions/auth-actions";
import { AnalyticsEvents, trackEvent } from "@/lib/posthog";
import { cn } from "@/lib/utils";

interface SidebarProps {
	treasuryName: string;
}

const NAV_ITEMS = [
	{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/transactions", label: "Transactions", icon: Receipt },
	{ href: "/accounts", label: "Accounts", icon: Wallet },
	{ href: "/swap", label: "Swap", icon: ArrowLeftRight },
	{ href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar({ treasuryName }: SidebarProps) {
	const pathname = usePathname();
	const _router = useRouter();
	const queryClient = useQueryClient();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	async function handleLogout() {
		setIsLoggingOut(true);
		trackEvent(AnalyticsEvents.LOGOUT);
		queryClient.clear();
		await clearPersistedCache();
		try {
			await logoutAction();
		} catch {
			// redirect throws
		}
	}

	const navContent = (
		<>
			<div className="mb-8 px-2">
				<h2 className="truncate text-lg font-semibold text-gray-900">
					{treasuryName}
				</h2>
			</div>

			<nav className="flex-1 space-y-1">
				{NAV_ITEMS.map((item) => {
					const isActive =
						pathname === item.href ||
						(item.href !== "/dashboard" && pathname.startsWith(item.href));

					return (
						<Link
							key={item.href}
							href={item.href}
							onClick={() => setMobileOpen(false)}
							className={cn(
								"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
								isActive
									? "bg-gray-100 text-gray-900"
									: "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
							)}
						>
							<item.icon className="h-5 w-5" />
							{item.label}
						</Link>
					);
				})}
			</nav>

			<div className="mt-auto pt-4">
				<button
					type="button"
					onClick={handleLogout}
					disabled={isLoggingOut}
					className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
				>
					<LogOut className="h-5 w-5" />
					{isLoggingOut ? "Logging out..." : "Logout"}
				</button>
			</div>
		</>
	);

	return (
		<>
			{/* Mobile hamburger button */}
			<button
				type="button"
				onClick={() => setMobileOpen(true)}
				className="fixed top-4 left-4 z-40 rounded-lg bg-white p-2 shadow-md lg:hidden"
				aria-label="Open menu"
			>
				<Menu className="h-5 w-5" />
			</button>

			{/* Mobile overlay */}
			{mobileOpen && (
				<button
					type="button"
					className="fixed inset-0 z-40 bg-black/50 lg:hidden"
					onClick={() => setMobileOpen(false)}
					aria-label="Close menu"
				/>
			)}

			{/* Mobile sidebar */}
			<aside
				className={cn(
					"fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white p-4 transition-transform duration-200 lg:hidden",
					mobileOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<button
					type="button"
					onClick={() => setMobileOpen(false)}
					className="mb-4 ml-auto rounded-md p-1 hover:bg-gray-100"
					aria-label="Close menu"
				>
					<X className="h-5 w-5" />
				</button>
				{navContent}
			</aside>

			{/* Desktop sidebar */}
			<aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:p-4">
				{navContent}
			</aside>
		</>
	);
}
