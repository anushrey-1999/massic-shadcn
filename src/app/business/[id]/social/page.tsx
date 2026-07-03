"use client"

import React from 'react'
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs'
import { SocialTableClient } from '@/components/organisms/SocialTable/social-table-client'
import {
  SocialBubbleChart,
  type SocialBubbleColorMetric,
  type SocialBubbleDatum,
} from '@/components/organisms/SocialBubbleChart/social-bubble-chart'
import { PageHeader } from '@/components/molecules/PageHeader'
import { WorkflowStatusBanner } from '@/components/molecules/WorkflowStatusBanner'
import { useBusinessProfileById } from '@/hooks/use-business-profiles'
import { useJobByBusinessId } from '@/hooks/use-jobs'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CircleDot, List, ListFilter } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useSocial } from "@/hooks/use-social"
import { Typography } from '@/components/ui/typography'
import { BUSINESS_RELEVANCE_PALETTE } from '@/components/organisms/StrategyBubbleChart/strategy-bubble-chart'
import { getWorkflowStatus, isWorkflowSuccess } from '@/lib/workflow-status'
import type { SocialStrategyType } from '@/types/social-types'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PageProps {
  params: Promise<{
    id: string
  }>
}

type BusinessSocialPageProps = PageProps & {
  isReadOnly?: boolean
  skipEntitlements?: boolean
}

type RelevanceFilter = "high" | "medium" | "low"

const RELEVANCE_FILTER_OPTIONS: Array<{
  value: RelevanceFilter
  label: string
  description: string
}> = [
  { value: "high", label: "High", description: "More than 70%" },
  { value: "medium", label: "Medium", description: "40% to 70%" },
  { value: "low", label: "Low", description: "Less than 40%" },
]

function getRelevancePercent(score?: number) {
  if (score === undefined || score === null || !Number.isFinite(score)) return null
  return score <= 1 ? score * 100 : score
}

function matchesRelevanceFilter(score: number | undefined, filters: RelevanceFilter[]) {
  if (filters.length === 0) return true

  const percent = getRelevancePercent(score)
  if (percent === null) return false

  return filters.some((filter) => {
    if (filter === "high") return percent > 70
    if (filter === "medium") return percent >= 40 && percent <= 70
    return percent < 40
  })
}

function getNumberValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return undefined
}

function SocialMapRelevanceFilter({
  selectedFilters,
  onToggle,
  onReset,
  offeringOptions,
  selectedOffering,
  onOfferingChange,
  formatOfferingLabel,
}: {
  selectedFilters: RelevanceFilter[]
  onToggle: (value: RelevanceFilter) => void
  onReset: () => void
  offeringOptions: string[]
  selectedOffering: string
  onOfferingChange: (value: string) => void
  formatOfferingLabel: (value: string) => string
}) {
  const selectedSet = React.useMemo(
    () => new Set(selectedFilters),
    [selectedFilters]
  )
  const activeFilterCount =
    selectedFilters.length + (selectedOffering === "all" ? 0 : 1)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label="Filter relevance"
          className={`h-10 font-normal ${activeFilterCount > 0
            ? "min-w-10 px-2 gap-1.5"
            : "w-10 p-0"
            }`}
        >
          <ListFilter className="text-muted-foreground h-4 w-4" />
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="h-[18.24px] rounded-[3.2px] px-[5.12px] font-mono font-normal text-[10.4px]"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex w-full max-w-(--radix-popover-content-available-width) flex-col gap-3.5 p-4 sm:min-w-[320px]"
      >
        <div className="flex flex-col gap-1">
          <h4 className="font-medium leading-none">
            {activeFilterCount > 0 ? "Filters" : "No filters applied"}
          </h4>
          <p className="text-muted-foreground text-sm">
            Filter campaigns by offering and business relevance.
          </p>
        </div>

        {offeringOptions.length > 0 ? (
          <div className="flex flex-col gap-2">
            <Typography
              variant="p"
              className="text-sm font-medium text-general-muted-foreground"
            >
              Offerings
            </Typography>
            <Select value={selectedOffering} onValueChange={onOfferingChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All offerings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offerings</SelectItem>
                {offeringOptions.map((offering) => (
                  <SelectItem key={offering} value={offering}>
                    {formatOfferingLabel(offering)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Typography
            variant="p"
            className="text-sm font-medium text-general-muted-foreground"
          >
            Relevance
          </Typography>
          {RELEVANCE_FILTER_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 hover:bg-accent"
            >
              <Checkbox
                checked={selectedSet.has(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>

        {activeFilterCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="w-fit rounded"
            onClick={onReset}
          >
            Reset filters
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function SocialEntitledContent({
  businessId,
  onChannelSelect,
  isReadOnly,
}: {
  businessId: string
  onChannelSelect: (channel: string | null) => void
  isReadOnly?: boolean
}) {

  const [socialTab, setSocialTab] = useQueryState(
    "social_tab",
    parseAsString.withDefault("publish")
  )
  const [, setCampaignName] = useQueryState(
    "campaign_name",
    parseAsString
  )
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1)
  )
  const [socialView, setSocialView] = React.useState<"list" | "bubble">("list")
  const [selectedOffering, setSelectedOffering] = React.useState<string>("all")
  const [bubbleColorMetric, setBubbleColorMetric] =
    React.useState<SocialBubbleColorMetric>("topicCoverage")
  const [selectedRelevanceFilters, setSelectedRelevanceFilters] =
    React.useState<RelevanceFilter[]>([])
  const activeSocialTab: SocialStrategyType = socialTab === "engage" ? "engage" : "publish"

  const { fetchAllSocialPages } = useSocial(businessId, activeSocialTab)

  const { data: bubbleData, isLoading: bubbleDataLoading } = useQuery({
    queryKey: ["social-all-pages", activeSocialTab, businessId],
    queryFn: () => fetchAllSocialPages(businessId),
    enabled: socialView === "bubble" && !!businessId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })

  const handleSocialTabChange = React.useCallback((value: string) => {
    const nextTab: SocialStrategyType = value === "engage" ? "engage" : "publish"
    setSocialTab(nextTab)
    onChannelSelect(null)
    setCampaignName(null)
    setPage(1)
    setSelectedOffering("all")
    setSelectedRelevanceFilters([])
  }, [onChannelSelect, setCampaignName, setPage, setSocialTab])

  type SocialBubbleRow = SocialBubbleDatum & { offerings?: string[] }

  const formatOfferingLabel = React.useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return value
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  }, [])

  const bubbleRows = React.useMemo((): SocialBubbleRow[] => {
    const rows = bubbleData?.data
    if (!rows?.length) return []

    return rows
      .map((row): SocialBubbleRow | null => {
        const channel_name = String(row.channel_name ?? '').trim()
        const campaign_name = String(row.campaign_name ?? '').trim()
        if (!channel_name || !campaign_name) return null

        const channel_relevance = getNumberValue(row.channel_relevance)
        const campaign_relevance = getNumberValue(row.campaign_relevance)
        const channel_coverage = getNumberValue(
          row.channel_coverage,
          row.topic_coverage,
          row.coverage
        )
        const campaign_coverage = getNumberValue(
          row.campaign_coverage,
          row.campaign_topic_coverage,
          row.topic_coverage,
          row.coverage
        )
        const campaignOfferingsRaw = row.campaign_offerings
        const campaign_offerings = Array.isArray(campaignOfferingsRaw)
          ? campaignOfferingsRaw.filter((o): o is string => typeof o === 'string').map((o) => o.trim()).filter(Boolean)
          : undefined
        const offerings = [
          ...(Array.isArray(row.offerings) ? row.offerings : []),
          ...(Array.isArray(row.channel_offerings) ? row.channel_offerings : []),
          ...(campaign_offerings ?? []),
        ]
          .filter((o): o is string => typeof o === 'string')
          .map((o) => o.trim())
          .filter(Boolean)

        const out: SocialBubbleRow = { channel_name, campaign_name }
        if (channel_relevance !== undefined) out.channel_relevance = channel_relevance
        if (campaign_relevance !== undefined) out.campaign_relevance = campaign_relevance
        if (channel_coverage !== undefined) out.channel_coverage = channel_coverage
        if (campaign_coverage !== undefined) out.campaign_coverage = campaign_coverage
        if (campaign_offerings?.length) out.campaign_offerings = campaign_offerings
        if (offerings?.length) out.offerings = offerings
        return out
      })
      .filter((x): x is SocialBubbleRow => x !== null)
  }, [bubbleData])

  const offeringOptions = React.useMemo(() => {
    const unique = new Set<string>()
    for (const row of bubbleRows) {
      const offerings = Array.isArray(row.offerings) ? row.offerings : []
      for (const offering of offerings) {
        if (typeof offering !== "string") continue
        const trimmed = offering.trim()
        if (trimmed) unique.add(trimmed)
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [bubbleRows])

  React.useEffect(() => {
    if (selectedOffering === "all") return
    if (offeringOptions.includes(selectedOffering)) return
    setSelectedOffering("all")
  }, [offeringOptions, selectedOffering])

  const toggleRelevanceFilter = React.useCallback((value: RelevanceFilter) => {
    setSelectedRelevanceFilters((current) =>
      current.includes(value)
        ? current.filter((filter) => filter !== value)
        : [...current, value]
    )
  }, [])

  const resetRelevanceFilters = React.useCallback(() => {
    setSelectedRelevanceFilters([])
    setSelectedOffering("all")
  }, [])

  const filteredBubbleRows = React.useMemo(() => {
    return bubbleRows.filter((row) => {
      const offerings = Array.isArray(row.offerings) ? row.offerings : []
      const matchesOffering =
        selectedOffering === "all" ||
        offerings.some((o) => typeof o === "string" && o.trim() === selectedOffering)

      return (
        matchesOffering &&
        matchesRelevanceFilter(row.campaign_relevance, selectedRelevanceFilters)
      )
    })
  }, [bubbleRows, selectedOffering, selectedRelevanceFilters])

  const socialViewTabs = (
    <Tabs
      value={socialView}
      onValueChange={(value) => setSocialView(value as "list" | "bubble")}
      className="shrink-0"
    >
      <TabsList>
        <TabsTrigger value="list">
          <List />
          List
        </TabsTrigger>
        <TabsTrigger value="bubble">
          <CircleDot />
          Map
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )

  return (
    <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
      <Tabs
        value={activeSocialTab}
        onValueChange={handleSocialTabChange}
        className="shrink-0 mb-4"
      >
        <TabsList className="shrink-0">
          <TabsTrigger value="publish">Publish</TabsTrigger>
          <TabsTrigger value="engage">Engage</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 min-h-0 overflow-hidden">
        {socialView === "list" ? (
          <SocialTableClient
            businessId={businessId}
            strategyType={activeSocialTab}
            toolbarRightPrefix={socialViewTabs}
            isReadOnly={isReadOnly}
          />
        ) : (
          <div className="bg-white rounded-lg p-4 h-full flex flex-col gap-2.5 overflow-hidden">
            <div
              role="toolbar"
              aria-orientation="horizontal"
              className="flex w-full items-start justify-between gap-2 p-1"
            >
              <div>
                <Select
                  value={bubbleColorMetric}
                  onValueChange={(value) =>
                    setBubbleColorMetric(value as SocialBubbleColorMetric)
                  }
                >
                  <SelectTrigger className="mb-2 w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="topicCoverage">
                      Topic Coverage
                    </SelectItem>
                    <SelectItem value="businessRelevance">
                      Business Relevance
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative h-5 w-[320px] max-w-full rounded-full overflow-hidden">
                  <div className="absolute inset-0 flex">
                    {BUSINESS_RELEVANCE_PALETTE.map((color) => (
                      <div
                        key={color}
                        className="h-full flex-1 shadow-inner"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="text-[10px] font-medium text-general-muted-foreground">
                      Low
                    </span>
                    <span className="text-[10px] font-medium text-general-muted-foreground">
                      High
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <SocialMapRelevanceFilter
                  selectedFilters={selectedRelevanceFilters}
                  onToggle={toggleRelevanceFilter}
                  onReset={resetRelevanceFilters}
                  offeringOptions={offeringOptions}
                  selectedOffering={selectedOffering}
                  onOfferingChange={setSelectedOffering}
                  formatOfferingLabel={formatOfferingLabel}
                />
                {socialViewTabs}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {bubbleDataLoading ? (
                <div className="h-full min-h-[640px] flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">Loading…</div>
                </div>
              ) : filteredBubbleRows.length ? (
                <div className="w-full h-full min-h-[640px]">
                  <SocialBubbleChart
                    data={filteredBubbleRows}
                    colorMetric={bubbleColorMetric}
                  />
                </div>
              ) : (
                <div className="h-full min-h-[640px] flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">No bubble data available.</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BusinessSocialPage({
  params,
  isReadOnly,
  skipEntitlements,
}: BusinessSocialPageProps) {
  const [businessId, setBusinessId] = React.useState<string>('')
  const [, setSelectedChannel] = useQueryState(
    "channel_name",
    parseAsString
  )
  const [campaignName] = useQueryState(
    "campaign_name",
    parseAsString
  )

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id))
  }, [params])

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null)
  const { data: jobDetails, isLoading: jobDetailsLoading } = useJobByBusinessId(businessId || null)
  const coreStatus = getWorkflowStatus(jobDetails, "core") ?? jobDetails?.workflow_status?.status
  const showMainContent =
    coreStatus === "success" &&
    isWorkflowSuccess(jobDetails, "social_channels")

  const businessName = profileData?.Name || profileData?.DisplayName || "Business"

  const breadcrumbs = React.useMemo(() => {
    const baseBreadcrumbs = [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Social", href: `/business/${businessId}/social` },
    ]
    if (campaignName) {
      baseBreadcrumbs.push({ label: campaignName })
    }
    return baseBreadcrumbs
  }, [businessName, businessId, campaignName])

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (profileDataLoading) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader
          breadcrumbs={breadcrumbs}
        />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const content = !jobDetailsLoading && showMainContent ? (
    <SocialEntitledContent
      businessId={businessId}
      onChannelSelect={(channel) => setSelectedChannel(channel)}
      isReadOnly={isReadOnly}
    />
  ) : (
    <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
      <WorkflowStatusBanner
        businessId={businessId}
        workflowKey="social_channels"
        emptyStateHeight="min-h-[calc(100vh-12rem)]"
      />
    </div>
  )

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        breadcrumbs={breadcrumbs}
      />
      {skipEntitlements ? (
        content
      ) : (
        <EntitlementsGuard
          entitlement="content"
          businessId={businessId}
          alertMessage="Upgrade your plan to unlock Social content generation."
        >
          {content}
        </EntitlementsGuard>
      )}
    </div>
  )
}
