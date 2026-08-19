import { Skeleton } from "@/components/ui/skeleton";

export function CampaignImpactReportSkeleton() {
  return (
    <main className="w-full max-w-[1224px] space-y-4 px-5 py-5 md:px-7" aria-busy="true" aria-label="Loading campaign report">
      <div className="flex flex-col gap-3 border-b border-general-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-64 max-w-[70vw]" />
          <Skeleton className="h-4 w-80 max-w-[80vw]" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <section className="overflow-hidden rounded-[8px] border border-general-border bg-white shadow-xs">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-56 max-w-[45vw]" />
        </div>
        <div className="grid divide-y divide-general-border border-t border-general-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[0, 1, 2].map(index => (
            <div key={index} className="space-y-2 px-4 py-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
        <div className="border-t border-general-border">
          <Skeleton className="h-9 w-full rounded-none" />
          {[0, 1, 2, 3, 4].map(index => (
            <div key={index} className="border-t border-general-border px-4 py-3">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
