"use client"

import React from "react"
import InfiniteScroll from "react-infinite-scroll-component"
import { PageHeader } from "@/components/molecules/PageHeader"
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Typography } from "@/components/ui/typography"
import { ReviewsCard } from "@/components/molecules/ReviewsCard"
import { ReviewsCardSkeleton } from "@/components/molecules/ReviewsCardSkeleton"
import { IgnoreReviewDialog } from "@/components/molecules/IgnoreReviewDialog"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"
import {
  ArrowDownUp,
  Check,
  Search,
  Star,
  MessageSquareText,
  Users,
  MapPin,
  Settings,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EmptyState } from "@/components/molecules/EmptyState"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponderSettingsModal } from "@/components/molecules/ResponderSettingsModal"
import { CustomersTableClient } from "@/components/organisms/ReviewsCustomersTable/customers-table-client"
import { CampaignsTableClient } from "@/components/organisms/ReviewsCampaignTable/campaigns-table-client"
import { useBusinessProfileById } from "@/hooks/use-business-profiles"
import { useReviews, useIgnoreReview, type ReviewSortBy } from "@/hooks/use-reviews"
import { useDebounce } from "@/hooks/use-debounce"
import { useAuthStore } from "@/store/auth-store"
import { useBusinessProfileSettings } from "@/hooks/use-review-responder-settings"

interface ReviewsTemplateProps {
  businessId: string
  businessName: string
}

export function ReviewsTemplate({ businessId, businessName }: ReviewsTemplateProps) {
  const [activeTab, setActiveTab] = React.useState<"reviews" | "campaign" | "customers">("reviews")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<ReviewSortBy>("recent")
  const [sortOpen, setSortOpen] = React.useState(false)
  const [selectedLocation, setSelectedLocation] = React.useState<string>("")
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [ignoreDialogOpen, setIgnoreDialogOpen] = React.useState(false)
  const [reviewToIgnore, setReviewToIgnore] = React.useState<{ id: string; name: string } | null>(null)
  const [ignoringReviewId, setIgnoringReviewId] = React.useState<string | null>(null)

  const debouncedSearch = useDebounce(searchQuery, 500)

  const { user } = useAuthStore()
  const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id || null

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null)

  // Fetch business profile settings for review responder
  useBusinessProfileSettings(businessId, userUniqueId)

  const locations = React.useMemo(() => {
    if (!profileData?.Locations || profileData.Locations.length === 0) {
      return []
    }
    return profileData.Locations.map((loc, index) => ({
      value: `${loc.Name}__${index}`,
      name: loc.Name,
      label: `${loc.DisplayName || loc.Name} - ${index + 1}`,
      // Use the Name field which already contains locationId in format "locations/..."
      locationId: loc.Name,
    }))
  }, [profileData])

  React.useEffect(() => {
    if (locations.length === 0) {
      if (selectedLocation) setSelectedLocation("")
      return
    }

    const exists = locations.some((loc) => loc.value === selectedLocation)
    if (!exists) {
      setSelectedLocation(locations[0].value)
    }
  }, [locations, selectedLocation])

  const selectedLocationId = React.useMemo(() => {
    if (!selectedLocation) return null
    const match = locations.find((loc) => loc.value === selectedLocation)
    return match?.name || null
  }, [locations, selectedLocation])

  // Get locationId in format locations/{id} for API
  const selectedLocationIdForApi = React.useMemo(() => {
    if (!selectedLocation) return null
    const match = locations.find((loc) => loc.value === selectedLocation)
    return match?.locationId || null
  }, [locations, selectedLocation])

  const {
    reviews,
    totalReviews,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useReviews({
    locationId: selectedLocationId,
    sortBy,
    search: debouncedSearch,
  })

  const ignoreReviewMutation = useIgnoreReview(selectedLocationId, sortBy, debouncedSearch)

  const handleIgnoreClick = React.useCallback((reviewId: string, reviewerName: string) => {
    setReviewToIgnore({ id: reviewId, name: reviewerName })
    setIgnoreDialogOpen(true)
  }, [])

  const handleIgnoreConfirm = React.useCallback(async () => {
    if (reviewToIgnore) {
      setIgnoringReviewId(reviewToIgnore.id)
      try {
        await ignoreReviewMutation.mutateAsync(reviewToIgnore.id)
      } finally {
        setIgnoringReviewId(null)
        setReviewToIgnore(null)
      }
    }
  }, [reviewToIgnore, ignoreReviewMutation])

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Reviews", href: `/business/${businessId}/reviews` },
    ],
    [businessName, businessId]
  )

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} />
      <EntitlementsGuard entitlement="reviews" businessId={businessId}>
        <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="shrink-0 flex items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="reviews">
                  <Star />
                  Reviews
                </TabsTrigger>
                <TabsTrigger value="campaign">
                  <MessageSquareText />
                  Campaigns
                </TabsTrigger>
                <TabsTrigger value="customers">
                  <Users />
                  Customers
                </TabsTrigger>
              </TabsList>

              {activeTab === "reviews" ? (
                <div className="flex items-center gap-3">
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger className="bg-transparent shadow-xs min-w-40 text-general-foreground gap-1">
                      <MapPin className="h-4 w-4 text-general-foreground" />
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {locations.map((loc) => (
                        <SelectItem key={loc.value} value={loc.value}>
                          {loc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white shadow-xs"
                    type="button"
                    aria-label="Reviews settings"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>

            <TabsContent value="reviews" className={cn("flex-1 min-h-0 overflow-hidden", "mt-4")}>
              <div className="bg-white rounded-lg p-4 flex flex-col gap-3 h-full min-h-0">
                <div className="flex items-center gap-3">
                  <InputGroup className="w-full max-w-[320px] bg-white">
                    <InputGroupAddon>
                      <Search className="h-4 w-4 text-general-muted-foreground" />
                    </InputGroupAddon>
                    <InputGroupInput
                      placeholder="Search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </InputGroup>

                  <Popover open={sortOpen} onOpenChange={setSortOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="bg-white shadow-xs"
                        type="button"
                        aria-label="Sort reviews"
                      >
                        <ArrowDownUp className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" align="end">
                      <div className="px-1.5 pb-2">
                        <p className="text-sm font-medium">Sort by</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          className="justify-start gap-2"
                          onClick={() => {
                            setSortBy("recent")
                            setSortOpen(false)
                          }}
                          type="button"
                        >
                          <span className="inline-flex w-4 justify-center">
                            {sortBy === "recent" ? <Check className="h-4 w-4" /> : null}
                          </span>
                          Most recent
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start gap-2"
                          onClick={() => {
                            setSortBy("highest")
                            setSortOpen(false)
                          }}
                          type="button"
                        >
                          <span className="inline-flex w-4 justify-center">
                            {sortBy === "highest" ? <Check className="h-4 w-4" /> : null}
                          </span>
                          Highest rated
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start gap-2"
                          onClick={() => {
                            setSortBy("lowest")
                            setSortOpen(false)
                          }}
                          type="button"
                        >
                          <span className="inline-flex w-4 justify-center">
                            {sortBy === "lowest" ? <Check className="h-4 w-4" /> : null}
                          </span>
                          Lowest rated
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  {!selectedLocationId ? (
                    <div className="flex items-center justify-center h-full">
                      <EmptyState
                        title="No location selected"
                        description="Please select a location to view reviews"
                        showCard={false}
                      />
                    </div>
                  ) : isLoading ? (
                    <div className="flex flex-col gap-3 overflow-y-auto h-full">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <ReviewsCardSkeleton key={idx} />
                      ))}
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <EmptyState
                        title="No reviews found"
                        description={
                          searchQuery
                            ? "Try adjusting your search query"
                            : "No reviews available for this location"
                        }
                        showCard={false}
                      />
                    </div>
                  ) : (
                    <div
                      id="scrollableReviewsDiv"
                      className="overflow-y-auto h-full"
                      style={{ height: "100%" }}
                    >
                      <InfiniteScroll
                        dataLength={reviews.length}
                        next={fetchNextPage}
                        hasMore={hasNextPage ?? false}
                        loader={
                          <div className="py-4 flex justify-center">
                            <ReviewsCardSkeleton />
                          </div>
                        }
                        scrollableTarget="scrollableReviewsDiv"
                        className="flex flex-col gap-3"
                      >
                        {reviews.map((review, idx) => (
                          <ReviewsCard
                            key={review.ReviewId || idx}
                            title={review.ReviewerDisplayName || "Anonymous"}
                            rating={review.numericRating || parseInt(review.StarRating) || 0}
                            reviewText={review.Comment || ""}
                            reviewerImageSrc={review.ReviewerProfilePhotoUrl || undefined}
                            existingReply={review.ReviewReplyComment}
                            isIgnored={review.IsIgnored}
                            isIgnoring={ignoringReviewId === review.ReviewId}
                            onIgnore={() => handleIgnoreClick(review.ReviewId, review.ReviewerDisplayName || "Anonymous")}
                          />
                        ))}
                      </InfiniteScroll>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="campaign" className={cn("flex-1 min-h-0 overflow-hidden", "mt-4")}>
              <div className="bg-white rounded-lg p-4 h-full min-h-0">
                <CampaignsTableClient businessId={businessId} />
              </div>
            </TabsContent>

            <TabsContent value="customers" className={cn("flex-1 min-h-0 overflow-hidden", "mt-4")}>
              <div className="bg-white rounded-lg p-4 h-full min-h-0">
                <CustomersTableClient />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </EntitlementsGuard>

      <IgnoreReviewDialog
        open={ignoreDialogOpen}
        onOpenChange={setIgnoreDialogOpen}
        onConfirm={handleIgnoreConfirm}
        reviewerName={reviewToIgnore?.name || ""}
      />

      <ResponderSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        businessId={businessId}
        userUniqueId={userUniqueId}
        locationId={selectedLocationIdForApi}
      />
    </div>
  )
}

