import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/skeleton";

/** Loading skeleton for the trends screen. */
export default function AnalyticsLoading() {
  return (
    <>
      <SkeletonHeader />
      <div className="flex w-full max-w-[1120px] flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-10 w-32" />
        </div>
        <SkeletonCard className="h-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard className="h-72" />
          <SkeletonCard className="h-72" />
        </div>
        <SkeletonCard className="h-40" />
      </div>
    </>
  );
}
