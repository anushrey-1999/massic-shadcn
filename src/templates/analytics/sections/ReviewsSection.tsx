"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { RatingCard } from "../components/RatingCard"
import { useLocalPresence, type TimePeriodValue } from "@/hooks/use-local-presence"
import { useBusinessStore } from "@/store/business-store"

interface ReviewsSectionProps {
  period?: TimePeriodValue
  selectedLocation?: string
}

export function ReviewsSection({ period = "3 months", selectedLocation = "" }: ReviewsSectionProps) {
  const pathname = usePathname()
  const profiles = useBusinessStore((state) => state.profiles)

  const { businessUniqueId, businessProfile } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/)
    if (!match) return { businessUniqueId: null, businessProfile: null }

    const id = match[1]
    const profile = profiles.find((p) => p.UniqueId === id)
    return {
      businessUniqueId: id,
      businessProfile: profile || null,
    }
  }, [pathname, profiles])

  const hasLocations = businessProfile?.Locations && businessProfile.Locations.length > 0

  const {
    reviewsData,
    isLoading,
  } = useLocalPresence(businessUniqueId, period, selectedLocation)

  if (!hasLocations) {
    return (
      <div className="flex flex-col gap-7">
        <h2 className="text-base font-semibold">Reviews</h2>
        <div className="flex items-center justify-center h-[120px] border rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground">No locations configured for this business</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-7">
        <h2 className="text-base font-semibold">Reviews</h2>
        <div className="flex items-center justify-center h-[120px] border rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <h2 className="text-base font-semibold">Reviews</h2>

      <div className="grid grid-cols-2 gap-4">
        <RatingCard
          title={`Ratings Past ${period}`}
          rating={Math.round(reviewsData.avgRating.value)}
          maxRating={5}
          change={reviewsData.avgRating.change}
        />
        <RatingCard
          title="All Time Reviews"
          value={reviewsData.allTimeReviews.value}
          change={reviewsData.allTimeReviews.change}
        />
      </div>
    </div>
  )
}
