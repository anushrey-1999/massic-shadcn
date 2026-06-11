import { Skeleton } from "@/components/ui/skeleton"

export function ReviewsCardSkeleton() {
  return (
    <div className="w-full bg-secondary rounded-lg p-4 flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-3 w-28" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>

      <div className="flex items-start gap-3 w-full">
        <div className="flex-1 bg-white rounded-lg p-2">
          <Skeleton className="h-3 w-36 mb-2" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-2 w-[91.5px] shrink-0">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  )
}
