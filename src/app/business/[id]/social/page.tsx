"use client"

import React from 'react'
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs'
import { SocialTableClient } from '@/components/organisms/SocialTable/social-table-client'
import { SocialBubbleChart, type SocialBubbleDatum } from '@/components/organisms/SocialBubbleChart/social-bubble-chart'
import { PageHeader } from '@/components/molecules/PageHeader'
import { WorkflowStatusBanner } from '@/components/molecules/WorkflowStatusBanner'
import { useBusinessProfileById } from '@/hooks/use-business-profiles'
import { useJobByBusinessId } from '@/hooks/use-jobs'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CircleDot, List } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useSocial } from "@/hooks/use-social"
import { Typography } from '@/components/ui/typography'
import { BUSINESS_RELEVANCE_PALETTE } from '@/components/organisms/StrategyBubbleChart/strategy-bubble-chart'
import { getWorkflowStatus, isWorkflowSuccess } from '@/lib/workflow-status'
import type { SocialStrategyType } from '@/types/social-types'
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

        const channel_relevance = typeof row.channel_relevance === 'number' ? row.channel_relevance : undefined
        const campaign_relevance = typeof row.campaign_relevance === 'number' ? row.campaign_relevance : undefined
        const campaignOfferingsRaw = row.campaign_offerings
        const campaign_offerings = Array.isArray(campaignOfferingsRaw)
          ? campaignOfferingsRaw.filter((o): o is string => typeof o === 'string').map((o) => o.trim()).filter(Boolean)
          : undefined
        const offeringsRaw = row.offerings ?? row.channel_offerings
        const offerings = Array.isArray(offeringsRaw)
          ? offeringsRaw.filter((o): o is string => typeof o === 'string').map((o) => o.trim()).filter(Boolean)
          : undefined

        const out: SocialBubbleRow = { channel_name, campaign_name }
        if (channel_relevance !== undefined) out.channel_relevance = channel_relevance
        if (campaign_relevance !== undefined) out.campaign_relevance = campaign_relevance
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

  const filteredBubbleRows = React.useMemo(() => {
    if (selectedOffering === "all") return bubbleRows
    return bubbleRows.filter((row) => {
      const offerings = Array.isArray(row.offerings) ? row.offerings : []
      return offerings.some((o) => typeof o === "string" && o.trim() === selectedOffering)
    })
  }, [bubbleRows, selectedOffering])

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
          <div className="bg-white rounded-lg p-4 h-full flex flex-col gap-3">
            <div className="shrink-0 flex items-center justify-between gap-4">
              <div>
                <Typography
                  variant="p"
                  className="font-mono mb-2 text-base text-general-muted-foreground"
                >
                  Channel Relevance
                </Typography>
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
                <Typography
                  variant="p"
                  className="text-base font-mono text-general-muted-foreground"
                >
                  {bubbleRows.length
                    ? `${filteredBubbleRows.length} item${filteredBubbleRows.length === 1 ? "" : "s"
                    }${selectedOffering === "all"
                      ? ""
                      : ` (of ${bubbleRows.length})`
                    }`
                    : bubbleDataLoading
                      ? "Loading.."
                      : "No data"}
                </Typography>
                {offeringOptions.length > 0 ? (
                  <Select value={selectedOffering} onValueChange={setSelectedOffering}>
                    <SelectTrigger className="w-[240px] max-w-[45vw]">
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
                ) : null}
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
                  <SocialBubbleChart data={filteredBubbleRows} />
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
