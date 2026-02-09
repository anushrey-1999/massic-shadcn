"use client"

import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/molecules/PageHeader'
import { WorkflowStatusBanner } from '@/components/molecules/WorkflowStatusBanner'
import { DigitalAdsTableClient } from '@/components/organisms/DigitalAdsTable'
import { TvRadioAdsTableClient } from '@/components/organisms/TvRadioAdsTable'
import { useBusinessProfileById } from '@/hooks/use-business-profiles'
import { useJobByBusinessId } from '@/hooks/use-jobs'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { usePathname, useRouter } from 'next/navigation'
import { Typography } from '@/components/ui/typography'
import { formatVolume } from '@/lib/format'
import type { DigitalAdsMetrics } from '@/types/digital-ads-types'
import type { TvRadioAdsMetrics } from '@/types/tv-radio-ads-types'
import { getWorkflowStatus, isWorkflowSuccess } from '@/lib/workflow-status'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

function AdsEntitledContent({ businessId }: { businessId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = React.useState<"digital" | "tv-radio">("digital")
  const [digitalMetrics, setDigitalMetrics] = React.useState<DigitalAdsMetrics | null>(null)
  const [tvRadioMetrics, setTvRadioMetrics] = React.useState<TvRadioAdsMetrics | null>(null)

  const handleTabChange = React.useCallback(
    (value: string) => {
      setActiveTab(value as "digital" | "tv-radio")
      router.replace(pathname)
    },
    [router, pathname]
  )

  const headerMetricsText = React.useMemo(() => {
    if (activeTab === "digital") {
      if (!digitalMetrics) return "Loading metrics..."
      const value =
        typeof digitalMetrics.total_clusters === "number"
          ? digitalMetrics.total_clusters
          : typeof digitalMetrics.total_ads === "number"
            ? digitalMetrics.total_ads
            : 0

      const label =
        typeof digitalMetrics.total_clusters === "number" ? "Ad Topics" : "Ads"

      return `${formatVolume(value)} ${label}`
    }

    if (activeTab === "tv-radio") {
      if (!tvRadioMetrics) return "Loading metrics..."
      return `${formatVolume(tvRadioMetrics.total_ads)} Sub Topics`
    }

    return null
  }, [activeTab, digitalMetrics, tvRadioMetrics])

  const { data: jobDetails } = useJobByBusinessId(businessId || null)
  const coreStatus = getWorkflowStatus(jobDetails, "core") ?? jobDetails?.workflow_status?.status
  const isCoreSuccess = coreStatus === "success"
  const isDigitalReady = isCoreSuccess && isWorkflowSuccess(jobDetails, "digital_ads_opportunity_scorer")
  const isTvRadioReady = isCoreSuccess && isWorkflowSuccess(jobDetails, "ad_concept_generator")

  return (
    <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="digital">Digital</TabsTrigger>
            <TabsTrigger value="tv-radio">TV & Radio</TabsTrigger>
          </TabsList>
          {headerMetricsText && (
            <Typography
              variant="p"
              className="text-sm font-mono text-general-muted-foreground"
            >
              {headerMetricsText}
            </Typography>
          )}
        </div>
        <TabsContent value="digital" className="flex-1 min-h-0 mt-4 overflow-hidden">
          {isDigitalReady ? (
            <DigitalAdsTableClient businessId={businessId} onMetricsChange={setDigitalMetrics} />
          ) : (
            <WorkflowStatusBanner
              businessId={businessId}
              workflowKey="digital_ads_opportunity_scorer"
              emptyStateHeight="min-h-[calc(100vh-12rem)]"
            />
          )}
        </TabsContent>
        <TabsContent value="tv-radio" className="flex-1 min-h-0 mt-4">
          {isTvRadioReady ? (
            <TvRadioAdsTableClient businessId={businessId} onMetricsChange={setTvRadioMetrics} />
          ) : (
            <WorkflowStatusBanner
              businessId={businessId}
              workflowKey="ad_concept_generator"
              emptyStateHeight="min-h-[calc(100vh-12rem)]"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function BusinessAdsPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>('')

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id))
  }, [params])

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null)
  const { data: jobDetails, isLoading: jobDetailsLoading } = useJobByBusinessId(businessId || null)
  const coreStatus = getWorkflowStatus(jobDetails, "core") ?? jobDetails?.workflow_status?.status
  const showMainContent = coreStatus === "success"

  const businessName = profileData?.Name || profileData?.DisplayName || "Business"

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Ads", href: `/business/${businessId}/ads` },
    ],
    [businessName, businessId]
  )

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
        <PageHeader breadcrumbs={breadcrumbs} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} />
      <EntitlementsGuard
        entitlement="ads"
        businessId={businessId}
        alertMessage="You're on Starter. Upgrade your plan to unlock Ads."
      >
        {!jobDetailsLoading && showMainContent ? (
          <AdsEntitledContent businessId={businessId} />
        ) : (
          <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
            <WorkflowStatusBanner
              businessId={businessId}
              emptyStateHeight="min-h-[calc(100vh-12rem)]"
            />
          </div>
        )}
      </EntitlementsGuard>
    </div>
  )
}
