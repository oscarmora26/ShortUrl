import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/skeleton";

/** Loading skeleton for the links index. */
export default function LinksLoading() {
  return (
    <>
      <SkeletonHeader />
      <div className="flex w-full max-w-[1120px] flex-col gap-6 p-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <SkeletonCard className="h-96" />
        <div className="flex justify-end gap-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </>
  );
}
