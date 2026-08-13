import { Skeleton } from "@/components/ui/skeleton";

export function CampaignImpactReportSkeleton() {
  return (
    <main className="w-full max-w-[1224px] space-y-5 px-5 py-6 md:px-7" aria-busy="true" aria-label="Loading campaign report">
      <div className="flex items-start justify-between gap-4 border-b border-general-border pb-5">
        <div className="space-y-3">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-7 w-64 max-w-[70vw]" />
          <Skeleton className="h-5 w-48 max-w-[55vw]" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <section className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </section>
      <Skeleton className="h-24 w-full" />
      <section className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-64 w-full" />
      </section>
    </main>
  );
}
