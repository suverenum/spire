import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("rounded-lg border border-white/[0.06] bg-[lch(7.67_0.75_272)] p-5", className)}
			{...props}
		/>
	),
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => <div ref={ref} className={cn("mb-4", className)} {...props} />,
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
	({ className, ...props }, ref) => (
		<h3
			ref={ref}
			className={cn("text-lg leading-none font-semibold tracking-tight", className)}
			{...props}
		/>
	),
);
CardTitle.displayName = "CardTitle";

export { Card, CardHeader, CardTitle };
