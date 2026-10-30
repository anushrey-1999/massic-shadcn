"use client"

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WebPageTableClient } from '@/components/organisms/WebPageTable/web-page-table-client'
import { WebOptimizationAnalysisTableClient } from '@/components/organisms/WebOptimizationAnalysisTable'
import { WebUnifiedPagesTableClient } from '@/components/organisms/WebUnifiedPagesTable'
import { WebsiteArchitectureTableClient } from '@/components/organisms/WebsiteArchitectureTable/website-architecture-table-client'
import { PageHeader } from '@/components/molecules/PageHeader'
import { ContentUsageInfo } from '@/components/molecules/content-usage'
import { WorkflowStatusBanner } from '@/components/molecules/WorkflowStatusBanner'
import { useBusinessProfileById } from '@/hooks/use-business-profiles'
import { useJobByBusinessId } from '@/hooks/use-jobs'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { useQueryClient } from '@tanstack/react-query'
import { useUnifiedWebOptimization } from '@/hooks/use-unified-web-optimization'
import { cn } from '@/lib/utils'
import { parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs'
import { Typography } from '@/components/ui/typography'
import { formatVolume } from '@/lib/format'
import type { WebPageMetrics } from '@/types/web-page-types'
import { WebChannelsTab } from '@/components/organisms/WebChannels/web-channels-tab'
import { getWorkflowStatus, isWorkflowSuccess } from '@/lib/workflow-status'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

function WebNewPagesTab({
  businessId,
  onMetricsChange,
}: {
  businessId: string;
  onMetricsChange?: (metrics: WebPageMetrics | null) => void;
}) {
  return <WebPageTableClient businessId={businessId} onMetricsChange={onMetricsChange} />
}

export default function BusinessWebPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>('')
  const [isOptimizeSplitView, setIsOptimizeSplitView] = React.useState(false)
  const [{ tab: activeTab, integrations }, setWebQuery] = useQueryStates({
    tab: parseAsStringEnum(["new-pages", "web-pages-v2", "optimize", "all-pages", "settings"]).withDefault("new-pages"),
    integrations: parseAsString,
  })
  const [newPagesMetrics, setNewPagesMetrics] = React.useState<WebPageMetrics | null>(null)

  React.useEffect(() => {
    if (activeTab !== "optimize") setIsOptimizeSplitView(false)
  }, [activeTab]);

  // Navigate to Settings tab when opening with ?integrations=1 (e.g. from "Connect WordPress" flows)
  React.useEffect(() => {
    if (integrations === "1") {
      void setWebQuery({ tab: "settings", integrations: null });
    }
  }, [integrations, setWebQuery]);

  const handleTabChange = React.useCallback(
    (value: string) => {
      const nextTab = value as "new-pages" | "web-pages-v2" | "optimize" | "all-pages" | "settings"
      void setWebQuery({ tab: nextTab })
      if (nextTab !== "optimize") {
        setIsOptimizeSplitView(false)
      }
    },
    [setWebQuery]
  )

  const newPagesMetricsText = React.useMemo(() => {
    if (activeTab !== "new-pages") return null
    if (!newPagesMetrics) return "Loading metrics..."
    return `${formatVolume(newPagesMetrics.total_pages)} Pages and ${formatVolume(newPagesMetrics.total_supporting_keywords)} Supporting Keywords`
  }, [activeTab, newPagesMetrics])

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id))
  }, [params])

  // Prefetch unified pages in background so data is ready when the user switches to All Pages
  const queryClient = useQueryClient()
  const { fetchUnifiedPages } = useUnifiedWebOptimization()
  React.useEffect(() => {
    if (!businessId) return
    const queryKey = ['unified-web-optimization', businessId]
    const existing = queryClient.getQueryState(queryKey)
    // Skip prefetch if we already know data doesn't exist (NO_SNAPSHOT 404)
    if ((existing?.error as any)?.code === 'NO_SNAPSHOT') return
    queryClient.prefetchQuery({
      queryKey,
      queryFn: () => fetchUnifiedPages(businessId),
      staleTime: 1000 * 60,
    })
  }, [businessId, queryClient, fetchUnifiedPages])

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null)
  const { data: jobDetails, isLoading: jobDetailsLoading } = useJobByBusinessId(businessId || null)
  const coreStatus = getWorkflowStatus(jobDetails, "core") ?? jobDetails?.workflow_status?.status
  const showNewPagesContent =
    !jobDetailsLoading &&
    coreStatus === "success" &&
    isWorkflowSuccess(jobDetails, "webpages")

  const businessName = profileData?.Name || profileData?.DisplayName || "Business"
  const hideTabs = isOptimizeSplitView && activeTab === "optimize"

  const openSettingsTab = React.useCallback(() => {
    handleTabChange("settings")
  }, [handleTabChange])

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Web", href: `/business/${businessId}/web` },
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
        entitlement="web"
        businessId={businessId}
        alertMessage="You're on Starter. Upgrade your plan to unlock Web."
      >
        <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0">
            {!hideTabs && (
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <TabsList className="max-w-full justify-start overflow-x-auto">
                  <TabsTrigger value="new-pages">New Pages</TabsTrigger>
                  <TabsTrigger value="web-pages-v2">Web Pages v2</TabsTrigger>
                  <TabsTrigger value="optimize">Optimize</TabsTrigger>
                  <TabsTrigger value="all-pages">All Pages</TabsTrigger>
                </TabsList>
                <div className="ml-auto flex min-w-0 items-center gap-3">
                  {activeTab === "new-pages" && showNewPagesContent && newPagesMetricsText && (
                    <div className="flex min-w-0 items-center gap-1">
                      <Typography
                        variant="p"
                        className="text-right text-sm font-mono text-general-muted-foreground"
                      >
                        {newPagesMetricsText}
                      </Typography>
                      <ContentUsageInfo businessId={businessId} feature="blogs_pages" />
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-9 shrink-0 text-general-muted-foreground hover:text-general-foreground",
                      activeTab === "settings" && "text-general-foreground"
                    )}
                    onClick={openSettingsTab}
                    aria-label="Settings"
                  >
                    <Settings className="size-5" />
                  </Button>
                </div>
              </div>
            )}
            <TabsContent value="new-pages" className={cn("flex-1 min-h-0 overflow-hidden flex flex-col", !hideTabs && "mt-4")}>
              {showNewPagesContent ? (
                <WebNewPagesTab businessId={businessId} onMetricsChange={setNewPagesMetrics} />
              ) : (
                <WorkflowStatusBanner
                  businessId={businessId}
                  workflowKey="webpages"
                  emptyStateHeight="min-h-[calc(100vh-16rem)]"
                />
              )}
            </TabsContent>
            <TabsContent value="web-pages-v2" className="mt-4 flex flex-1 min-h-0 min-w-0 overflow-hidden flex-col">
              <WebsiteArchitectureTableClient key={businessId} businessId={businessId} />
            </TabsContent>
            <TabsContent value="optimize" className={cn("flex-1 min-h-0 overflow-hidden", !hideTabs && "mt-4")}>
              <EntitlementsGuard entitlement="webOptimize" businessId={businessId}>
                <WebOptimizationAnalysisTableClient businessId={businessId} onSplitViewChange={setIsOptimizeSplitView} />
              </EntitlementsGuard>
            </TabsContent>
            <TabsContent value="settings" className={cn("flex-1 min-h-0 overflow-hidden", !hideTabs && "mt-4")}>
              <WebChannelsTab
                businessId={businessId}
                defaultSiteUrl={profileData?.Website || ""}
                isActive={activeTab === "settings"}
              />
            </TabsContent>
            <TabsContent value="all-pages" className={cn("flex-1 min-h-0 overflow-hidden flex flex-col", !isOptimizeSplitView && "mt-4")}>
              <EntitlementsGuard entitlement="webOptimize" businessId={businessId}>
                <WebUnifiedPagesTableClient businessId={businessId} onSplitViewChange={setIsOptimizeSplitView} />
              </EntitlementsGuard>
            </TabsContent>
          </Tabs>
        </div >
      </EntitlementsGuard >
    </div >
  )
}
