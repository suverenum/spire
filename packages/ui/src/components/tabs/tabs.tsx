"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { cn } from "../../cn";

interface TabsContextValue {
	value: string;
	onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
	const ctx = useContext(TabsContext);
	if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
	return ctx;
}

interface TabsProps {
	defaultValue: string;
	onValueChange?: (value: string) => void;
	children: ReactNode;
	className?: string;
}

export function Tabs({ defaultValue, onValueChange, children, className }: TabsProps) {
	const [value, setValue] = useState(defaultValue);

	const handleChange = (v: string) => {
		setValue(v);
		onValueChange?.(v);
	};

	return (
		<TabsContext value={{ value, onValueChange: handleChange }}>
			<div className={className}>{children}</div>
		</TabsContext>
	);
}

interface TabsListProps {
	children: ReactNode;
	className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
	return (
		<div
			className={cn("inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1", className)}
			role="tablist"
		>
			{children}
		</div>
	);
}

interface TabsTriggerProps {
	value: string;
	children: ReactNode;
	className?: string;
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
	const { value: selected, onValueChange } = useTabs();
	const isActive = selected === value;

	return (
		<button
			type="button"
			role="tab"
			aria-selected={isActive}
			onClick={() => onValueChange(value)}
			className={cn(
				"rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
				isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
				className,
			)}
		>
			{children}
		</button>
	);
}

interface TabsContentProps {
	value: string;
	children: ReactNode;
	className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
	const { value: selected } = useTabs();
	if (selected !== value) return null;

	return (
		<div role="tabpanel" className={className}>
			{children}
		</div>
	);
}
