import { Skeleton } from "@/components/ui/skeleton";

export function ChartSectionSkeleton() {
  return (
    <div className="grid grid-cols-1">
      <div className="flex flex-col gap-4 rounded-lg border border-general-border bg-white p-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <Skeleton className="h-16 w-36" />
            <Skeleton className="h-16 w-36" />
          </div>
        </div>
        <Skeleton className="h-[250px] w-full" />
      </div>
    </div>
  );
}

export function TableSectionSkeleton() {
  return (
    <div className="rounded-lg border border-general-border bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PositionDistributionSkeleton() {
  return (
    <div className="rounded-lg border border-general-border bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="flex gap-4 mb-4">
        <Skeleton className="h-12 w-24" />
        <Skeleton className="h-12 w-24" />
        <Skeleton className="h-12 w-24" />
      </div>
      <Skeleton className="h-[180px] w-full" />
    </div>
  );
}
