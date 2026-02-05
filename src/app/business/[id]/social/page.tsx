"use client"

import React from 'react'
import { useQueryState, parseAsString } from 'nuqs'
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
  skipEntitlements?: boolean
  isReadOnly?: boolean
}

function SocialEntitledContent({
  businessId,
  selectedChannel,
  onChannelSelect,
  isReadOnly,
}: {
  businessId: string
  selectedChannel: string | null
  onChannelSelect: (channel: string | null) => void
  isReadOnly?: boolean
}) {

  const [socialView, setSocialView] = React.useState<"list" | "bubble">("list")
  const [selectedOffering, setSelectedOffering] = React.useState<string>("all")

  const [cachedDownloadUrl, setCachedDownloadUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    setCachedDownloadUrl(null)
  }, [businessId])

  const { fetchChannelAnalyzerDownloadUrl, fetchDownloadPayloadFromUrl } = useSocial(businessId)

  const { data: downloadUrl, isFetching: downloadUrlFetching } = useQuery({
    queryKey: ["social-download-url", businessId],
    queryFn: async () => {
      const url = await fetchChannelAnalyzerDownloadUrl(businessId)
      return url || null
    },
    enabled: socialView === "bubble" && !!businessId && !cachedDownloadUrl,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })

  React.useEffect(() => {
    if (!downloadUrl) return
    if (cachedDownloadUrl) return
    setCachedDownloadUrl(downloadUrl)
  }, [downloadUrl, cachedDownloadUrl])

  const effectiveDownloadUrl = cachedDownloadUrl || downloadUrl

  const { data: bubbleData, isLoading: bubbleDataLoading, isFetching: bubbleDataFetching } = useQuery({
    queryKey: ["social-download-data", businessId, effectiveDownloadUrl],
    queryFn: () => fetchDownloadPayloadFromUrl(effectiveDownloadUrl as string),
    enabled: socialView === "bubble" && !!businessId && !!effectiveDownloadUrl,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })

  type SocialBubbleRow = SocialBubbleDatum & { offerings?: string[] }

  const formatOfferingLabel = React.useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return value
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  }, [])

  const bubbleRows = React.useMemo((): SocialBubbleRow[] => {
    const source = bubbleData?.data as unknown
    if (!source) return []

    const itemsMaybe = (() => {
      if (Array.isArray(source)) return source
      if (typeof source === 'object' && source !== null) {
        const s = source as Record<string, unknown>
        if (Array.isArray(s.items)) return s.items

        const outputData = s.output_data
        if (typeof outputData === 'object' && outputData !== null) {
          const od = outputData as Record<string, unknown>
          if (Array.isArray(od.items)) return od.items
        }
      }
      return null
    })()

    if (!itemsMaybe) return []

    return itemsMaybe
      .map((row): SocialBubbleRow | null => {
        if (typeof row !== 'object' || row === null) return null
        const r = row as Record<string, unknown>

        const channel_name = String(r.channel_name ?? '').trim()
        const campaign_name = String(r.campaign_name ?? '').trim()
        const cluster_name = String(r.cluster_name ?? '').trim()
        const channel_relevance = typeof r.channel_relevance === 'number' ? r.channel_relevance : undefined
        const campaign_relevance = typeof r.campaign_relevance === 'number' ? r.campaign_relevance : undefined
        const cluster_relevance = typeof r.cluster_relevance === 'number' ? r.cluster_relevance : undefined
        const offeringsRaw = (r.offerings ?? r.channel_offerings) as unknown
        const offerings = Array.isArray(offeringsRaw)
          ? offeringsRaw
            .filter((o): o is string => typeof o === "string")
            .map((o) => o.trim())
            .filter(Boolean)
          : undefined

        if (!channel_name || !campaign_name) return null
        const out: SocialBubbleRow = {
          channel_name,
          campaign_name,
        }
        if (channel_relevance !== undefined) out.channel_relevance = channel_relevance
        if (campaign_relevance !== undefined) out.campaign_relevance = campaign_relevance
        if (cluster_name) out.cluster_name = cluster_name
        if (cluster_relevance !== undefined) out.cluster_relevance = cluster_relevance
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
      <div className="flex-1 min-h-0 overflow-hidden">
        {socialView === "list" ? (
          <SocialTableClient businessId={businessId} toolbarRightPrefix={socialViewTabs} isReadOnly={isReadOnly} />
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
                    : downloadUrlFetching || bubbleDataLoading || bubbleDataFetching
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
              {downloadUrlFetching && !effectiveDownloadUrl ? (
                <div className="h-full min-h-[640px] flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">Loading…</div>
                </div>
              ) : filteredBubbleRows.length ? (
                <div className="w-full h-full min-h-[640px]">
                  <SocialBubbleChart data={filteredBubbleRows} />
                </div>
              ) : bubbleDataLoading || bubbleDataFetching ? (
                <div className="h-full min-h-[640px] flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">Loading…</div>
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

export default function BusinessSocialPage({ params, skipEntitlements = false, isReadOnly }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>('')
  const [selectedChannel, setSelectedChannel] = useQueryState(
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
  const workflowStatus = jobDetails?.workflow_status?.status
  const showMainContent = workflowStatus === "success"

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
      selectedChannel={selectedChannel || null}
      onChannelSelect={(channel) => setSelectedChannel(channel)}
      isReadOnly={isReadOnly}
    />
  ) : (
    <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
      <WorkflowStatusBanner
        businessId={businessId}
        emptyStateHeight="min-h-[calc(100vh-12rem)]"
      />
    </div>
  )

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        breadcrumbs={breadcrumbs}
      />
  {
    skipEntitlements ? (
      content
    ) : (
      <EntitlementsGuard
        entitlement="content"
        businessId={businessId}
        alertMessage="Upgrade your plan to unlock Social content generation."
      >
        {content}
      </EntitlementsGuard>
    )
  }
    </div >
  )
}
