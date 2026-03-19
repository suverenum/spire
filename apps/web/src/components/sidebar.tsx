"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { clearPersistedCache } from "@/components/providers";
import { logoutAction } from "@/domain/auth/actions/auth-actions";
import { AnalyticsEvents, trackEvent } from "@/lib/posthog";
import { cn } from "@/lib/utils";
import { HomeIcon, LogOutIcon, SettingsIcon, TransactionsIcon, WalletIcon } from "./icons";

interface SidebarProps {
	treasuryName: string;
}

const MAIN_NAV = [
	{ href: "/dashboard", label: "Home", icon: HomeIcon },
	{ href: "/transactions", label: "Transactions", icon: TransactionsIcon },
] as const;

const CASH_ACCOUNTS_NAV = [
	{ href: "/cash-accounts", label: "Cash accounts", icon: WalletIcon },
	{ href: "/agents", label: "Agent wallets", icon: WalletIcon },
] as const;

const BOTTOM_NAV = [{ href: "/settings", label: "Settings", icon: SettingsIcon }] as const;

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
			<div className="mb-6 flex items-center gap-2 px-2">
				<svg
					aria-hidden="true"
					className="h-6 w-6 shrink-0"
					viewBox="0 0 62 62"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<defs>
						<linearGradient id="hex-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
							<stop offset="0%" stopColor="#8B6FFF" />
							<stop offset="100%" stopColor="#2DD4BF" />
						</linearGradient>
					</defs>
					<path
						d="M24,7 L46,20 L46,46 L24,59 L2,46 L2,20 Z"
						stroke="#8B6FFF"
						strokeWidth="2"
						strokeLinejoin="round"
						fill="none"
						opacity="0.35"
					/>
					<path
						d="M36,4 L58,17 L58,43 L36,56 L14,43 L14,17 Z"
						stroke="url(#hex-sidebar)"
						strokeWidth="2.8"
						strokeLinejoin="round"
						fill="none"
					/>
				</svg>
				<span className="text-foreground truncate text-sm font-medium">{treasuryName}</span>
			</div>

			<nav className="flex-1">
				<div className="space-y-0.5">
					{MAIN_NAV.map((item) => {
						const isActive =
							pathname === item.href ||
							(item.href !== "/dashboard" && pathname.startsWith(item.href));
						return (
							<Link
								key={item.href}
								href={item.href}
								onClick={() => setMobileOpen(false)}
								className={cn(
									"flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
									isActive
										? "text-foreground bg-white/[0.08]"
										: "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
								)}
							>
								<item.icon className="h-4 w-4" />
								{item.label}
							</Link>
						);
					})}
				</div>

				<div className="mt-4 space-y-0.5">
					<div className="space-y-0.5">
						{CASH_ACCOUNTS_NAV.map((item) => {
							const isActive = pathname.startsWith(item.href);
							return (
								<Link
									key={item.href}
									href={item.href}
									onClick={() => setMobileOpen(false)}
									className={cn(
										"flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
										isActive
											? "text-foreground bg-white/[0.08]"
											: "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
									)}
								>
									<item.icon className="h-4 w-4" />
									{item.label}
								</Link>
							);
						})}
					</div>
				</div>

				<div className="mt-6 space-y-0.5">
					{BOTTOM_NAV.map((item) => {
						const isActive = pathname.startsWith(item.href);
						return (
							<Link
								key={item.href}
								href={item.href}
								onClick={() => setMobileOpen(false)}
								className={cn(
									"flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
									isActive
										? "text-foreground bg-white/[0.08]"
										: "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
								)}
							>
								<item.icon className="h-4 w-4" />
								{item.label}
							</Link>
						);
					})}
				</div>
			</nav>

			<div className="mt-auto">
				<button
					type="button"
					onClick={handleLogout}
					disabled={isLoggingOut}
					className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors hover:bg-white/[0.05] disabled:opacity-50"
				>
					<LogOutIcon className="h-4 w-4" />
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
				className="bg-muted fixed top-4 left-4 z-40 rounded-lg p-2 shadow-md lg:hidden"
				aria-label="Open menu"
			>
				<Menu className="text-foreground h-5 w-5" />
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
					"border-border bg-muted fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r p-4 transition-transform duration-200 lg:hidden",
					mobileOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<button
					type="button"
					onClick={() => setMobileOpen(false)}
					className="text-muted-foreground hover:bg-accent hover:text-foreground mb-4 ml-auto rounded-md p-1"
					aria-label="Close menu"
				>
					<X className="h-5 w-5" />
				</button>
				{navContent}
			</aside>

			{/* Desktop sidebar */}
			<aside className="lg:border-border lg:bg-muted hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-56 lg:flex-col lg:border-r lg:p-4">
				{navContent}
			</aside>
		</>
	);
}
