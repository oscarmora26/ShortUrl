import { Skeleton, SkeletonCard, SkeletonStats } from "@/components/skeleton";

/** Loading skeleton for a link's detail. */
export default function LinkDetailLoading() {
  return (
    <>
      <div className="flex h-[72px] items-center justify-between border-b border-line px-8">
        <div className="flex items-center gap-4">
          <Skeleton className="size-10" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-10 w-56" />
      </div>
      <div className="flex w-full max-w-[1120px] flex-col gap-6 p-8">
        <SkeletonCard className="h-24" />
        <SkeletonStats count={3} />
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <SkeletonCard className="h-80" />
          <div className="flex flex-col gap-6">
            <SkeletonCard className="h-40" />
            <SkeletonCard className="h-40" />
          </div>
        </div>
      </div>
    </>
  );
}
