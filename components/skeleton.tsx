import { cn } from "@/components/cn";

/**
 * Loading placeholders. `design/system.md` asks for a loading skeleton on every
 * admin route; the pulse is motion, so it only runs when motion is welcome.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md bg-raised motion-safe:animate-pulse",
        className,
      )}
    />
  );
}

/** The 72px bar every admin route starts with, while its data resolves. */
export function SkeletonHeader() {
  return (
    <div className="flex h-[72px] items-center justify-between border-b border-line px-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

/** The four stat cards of the panel. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-[116px] rounded-lg" />
      ))}
    </div>
  );
}

/** A card-shaped block, for charts and tables. */
export function SkeletonCard({ className }: { className?: string }) {
  return <Skeleton className={cn("rounded-lg", className)} />;
}
