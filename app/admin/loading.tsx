import { SkeletonCard, SkeletonHeader, SkeletonStats } from "@/components/skeleton";

/** Loading skeleton for the status screen (design/system.md hard rule 4). */
export default function AdminLoading() {
  return (
    <>
      <SkeletonHeader />
      <div className="flex w-full max-w-[1120px] flex-col gap-6 p-8">
        <SkeletonStats />
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <SkeletonCard className="h-72" />
          <SkeletonCard className="h-56" />
        </div>
        <SkeletonCard className="h-72" />
      </div>
    </>
  );
}
