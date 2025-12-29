"use client"

import React from 'react'
import { useQueryState, parseAsString } from 'nuqs'
import { SocialTableClient } from '@/components/organisms/SocialTable/social-table-client'
import { SocialBubbleChart, type SocialBubbleDatum } from '@/components/organisms/SocialBubbleChart/social-bubble-chart'
import { PageHeader } from '@/components/molecules/PageHeader'
import { WorkflowStatusBanner } from '@/components/molecules/WorkflowStatusBanner'
import { useJobByBusinessId } from '@/hooks/use-jobs'
import { useBusinessProfileById } from '@/hooks/use-business-profiles'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CircleDot, List } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useSocial } from "@/hooks/use-social"
import { Typography } from '@/components/ui/typography'
import { BUSINESS_RELEVANCE_PALETTE } from '@/components/organisms/StrategyBubbleChart/strategy-bubble-chart'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

function SocialEntitledContent({
  businessId,
  selectedChannel,
  onChannelSelect,
}: {
  businessId: string
  selectedChannel: string | null
  onChannelSelect: (channel: string | null) => void
}) {

  const [socialView, setSocialView] = React.useState<"list" | "bubble">("list")

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

  const bubbleRows = React.useMemo((): SocialBubbleDatum[] => {
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
      .map((row): SocialBubbleDatum | null => {
        if (typeof row !== 'object' || row === null) return null
        const r = row as Record<string, unknown>

        const channel_name = String(r.channel_name ?? '').trim()
        const campaign_name = String(r.campaign_name ?? '').trim()
        const cluster_name = String(r.cluster_name ?? '').trim()
        const channel_relevance = typeof r.channel_relevance === 'number' ? r.channel_relevance : undefined
        const campaign_relevance = typeof r.campaign_relevance === 'number' ? r.campaign_relevance : undefined
        const cluster_relevance = typeof r.cluster_relevance === 'number' ? r.cluster_relevance : undefined

        if (!channel_name || !campaign_name) return null
        const out: SocialBubbleDatum = {
          channel_name,
          campaign_name,
        }
        if (channel_relevance !== undefined) out.channel_relevance = channel_relevance
        if (campaign_relevance !== undefined) out.campaign_relevance = campaign_relevance
        if (cluster_name) out.cluster_name = cluster_name
        if (cluster_relevance !== undefined) out.cluster_relevance = cluster_relevance
        return out
      })
      .filter((x): x is SocialBubbleDatum => x !== null)
  }, [bubbleData])

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
          <SocialTableClient businessId={businessId} toolbarRightPrefix={socialViewTabs} />
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

              {socialViewTabs}
            </div>

            <div className="flex-1 min-h-0">
              {downloadUrlFetching && !effectiveDownloadUrl ? (
                <div className="h-full min-h-[640px] flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">Loading…</div>
                </div>
              ) : bubbleRows.length ? (
                <div className="w-full h-full min-h-[640px]">
                  <SocialBubbleChart data={bubbleRows} />
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

export default function BusinessSocialPage({ params }: PageProps) {
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
  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null)

  const businessName = profileData?.Name || profileData?.DisplayName || "Business"
  const workflowStatus = jobDetails?.workflow_status?.status
  const showContent = workflowStatus === "success"
  const showBanner = workflowStatus === "processing" || workflowStatus === "error" || !jobDetails

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

  if (profileDataLoading || jobLoading) {
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

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        breadcrumbs={breadcrumbs}
      />
      {showBanner && (
        <div className="w-full max-w-[1224px] px-5 pt-5">
          <WorkflowStatusBanner businessId={businessId} />
        </div>
      )}
      {showContent && jobDetails && (
        <EntitlementsGuard
          entitlement="content"
          businessId={businessId}
          alertMessage="Upgrade your plan to unlock Social content generation."
        >
          <SocialEntitledContent
            businessId={businessId}
            selectedChannel={selectedChannel || null}
            onChannelSelect={(channel) => setSelectedChannel(channel)}
          />
        </EntitlementsGuard>
      )}
    </div>
  )
}
