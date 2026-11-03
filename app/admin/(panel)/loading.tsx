import { SkeletonCard, SkeletonHeader, SkeletonStats } from "@/components/skeleton";

/**
 * Loading skeleton for the status screen only. It lives inside the `(panel)`
 * route group so that entering Links or Analíticas never paints it first.
 */
export default function AdminPanelLoading() {
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
