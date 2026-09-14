import { Skeleton } from "@/components/ui/skeleton";

export function CampaignImpactReportSkeleton({ variant = "page" }: { variant?: "page" | "sheet" }) {
  return (
    <div
      className={variant === "page" ? "flex w-full max-w-[920px] flex-col gap-6 bg-white py-9" : "flex w-full flex-col gap-6 bg-white py-9"}
      aria-busy="true"
      aria-label="Loading campaign report"
    >
      <div className="flex items-start justify-between gap-4 px-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 max-w-[70vw]" />
          <Skeleton className="h-6 w-36" />
        </div>
        <div className="hidden gap-3 sm:flex">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="h-px w-full bg-general-border" />
      <div className="grid grid-cols-1 gap-3 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map(index => (
          <Skeleton key={index} className="h-24 w-full rounded-md" />
        ))}
      </div>
      <div className="h-px w-full bg-general-border" />
      <div className="space-y-4 px-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-72 max-w-[80vw]" />
        </div>
        <Skeleton className="h-[246px] w-full rounded-md" />
        <Skeleton className="h-8 w-full rounded-md" />
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {[0, 1, 2, 3].map(index => (
            <Skeleton key={index} className="h-4 w-24" />
          ))}
        </div>
      </div>
      <div className="h-px w-full bg-general-border" />
      <div className="space-y-3 px-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-56 max-w-[45vw]" />
        </div>
        <Skeleton className="h-6 w-full" />
        {[0, 1, 2, 3, 4].map(index => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
