import { Skeleton } from "@/components/ui/skeleton"

export function ReviewsCardSkeleton() {
  return (
    <div className="w-full bg-secondary rounded-lg p-4 flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 w-full">
          <Skeleton className="h-5 flex-1" />
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>

      <div className="flex items-start gap-3 w-full">
        <div className="flex-1 bg-white rounded-lg p-2">
          <Skeleton className="h-3 w-32 mb-2" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="w-24 flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  )
}
