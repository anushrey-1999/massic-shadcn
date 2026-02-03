"use client"

import React from "react"
import { PageHeader } from "@/components/molecules/PageHeader"
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Typography } from "@/components/ui/typography"
import { ReviewsCard } from "@/components/molecules/ReviewsCard"
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

interface ReviewsTemplateProps {
  businessId: string
  businessName: string
}

export function ReviewsTemplate({ businessId, businessName }: ReviewsTemplateProps) {
  const [activeTab, setActiveTab] = React.useState<"reviews" | "campaign" | "customers">("reviews")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortDirection, setSortDirection] = React.useState<"desc" | "asc">("desc")
  const [sortOpen, setSortOpen] = React.useState(false)
  const [selectedLocation, setSelectedLocation] = React.useState<string>("location-xyz")
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Reviews", href: `/business/${businessId}/reviews` },
    ],
    [businessName, businessId]
  )

  const demoCards = React.useMemo(() => {
    const base = [
      {
        title: "Best Coffee Ever",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=12",
      },
      {
        title: "Great service",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=32",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
      {
        title: "Will come again",
        rating: 5,
        reviewText:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        reviewerImageSrc: "https://i.pravatar.cc/48?img=8",
      },
    ]

    const now = Date.now()
    return base.map((card, idx) => ({
      ...card,
      createdAt: now - idx * 60_000,
    }))
  }, [])

  const locations = React.useMemo(
    () => [
      { value: "location-xyz", label: "Location XYZ" },
      { value: "location-abc", label: "Location ABC" },
      { value: "location-123", label: "Location 123" },
    ],
    []
  )

  const visibleCards = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const filtered = q
      ? demoCards.filter((c) => {
          const haystack = `${c.title} ${c.reviewText}`.toLowerCase()
          return haystack.includes(q)
        })
      : demoCards

    const dir = sortDirection === "desc" ? -1 : 1
    return filtered
      .slice()
      .sort((a, b) => (a.createdAt - b.createdAt) * dir)
  }, [demoCards, searchQuery, sortDirection])

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
                    <SelectTrigger className="bg-transparent shadow-xs min-w-[160px] text-general-foreground gap-1">
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
                            setSortDirection("desc")
                            setSortOpen(false)
                          }}
                          type="button"
                        >
                          <span className="inline-flex w-4 justify-center">
                            {sortDirection === "desc" ? <Check className="h-4 w-4" /> : null}
                          </span>
                          Most recent
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start gap-2"
                          onClick={() => {
                            setSortDirection("asc")
                            setSortOpen(false)
                          }}
                          type="button"
                        >
                          <span className="inline-flex w-4 justify-center">
                            {sortDirection === "asc" ? <Check className="h-4 w-4" /> : null}
                          </span>
                          Least recent
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
                  {visibleCards.length > 0 ? (
                    visibleCards.map((card, idx) => (
                      <ReviewsCard
                        key={idx}
                        title={card.title}
                        rating={card.rating}
                        reviewText={card.reviewText}
                        reviewerImageSrc={card.reviewerImageSrc}
                      />
                    ))
                  ) : (
                    <div className="flex-1 min-h-0 flex items-center justify-center">
                      <EmptyState
                        title="No Reviews found"
                        showCard={false}
                        className="py-10"
                      />
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

      <ResponderSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}

