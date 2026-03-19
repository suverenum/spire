import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
	return <div className={cn("animate-pulse rounded-md bg-accent", className)} />;
}

export function BalanceSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{[1, 2, 3, 4].map((i) => (
				<div key={i} className="rounded-xl border border-border bg-muted p-6">
					<Skeleton className="mb-2 h-4 w-20" />
					<Skeleton className="h-8 w-32" />
				</div>
			))}
		</div>
	);
}

export function DashboardSkeleton() {
	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-border bg-muted">
				<div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-8 w-8 rounded-full" />
				</div>
			</header>
			<main className="mx-auto max-w-4xl px-4 py-6">
				<div className="mb-6 flex flex-col gap-4">
					<BalanceSkeleton />
					<div className="flex gap-3">
						<Skeleton className="h-12 flex-1 rounded-lg" />
						<Skeleton className="h-12 flex-1 rounded-lg" />
					</div>
				</div>
				<TransactionSkeleton />
			</main>
		</div>
	);
}

export function TransactionSkeleton() {
	return (
		<div className="space-y-3">
			{[1, 2, 3, 4, 5].map((i) => (
				<div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
					<Skeleton className="h-10 w-10 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-3 w-24" />
					</div>
					<Skeleton className="h-5 w-20" />
				</div>
			))}
		</div>
	);
}
