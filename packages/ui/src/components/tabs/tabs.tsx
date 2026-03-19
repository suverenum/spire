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
	defaultValue?: string;
	value?: string;
	onValueChange?: (value: string) => void;
	children: ReactNode;
	className?: string;
}

export function Tabs({
	defaultValue,
	value: controlledValue,
	onValueChange,
	children,
	className,
}: TabsProps) {
	const [internalValue, setInternalValue] = useState(controlledValue ?? defaultValue ?? "");
	const isControlled = controlledValue !== undefined;
	const currentValue = isControlled ? controlledValue : internalValue;

	const handleChange = (v: string) => {
		if (!isControlled) {
			setInternalValue(v);
		}
		onValueChange?.(v);
	};

	return (
		<TabsContext value={{ value: currentValue, onValueChange: handleChange }}>
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
			className={cn("bg-accent inline-flex items-center gap-1 rounded-lg p-1", className)}
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
				isActive
					? "bg-muted text-foreground shadow-sm"
					: "text-muted-foreground hover:text-foreground",
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
