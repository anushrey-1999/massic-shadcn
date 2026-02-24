"use client"

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WebPageTableClient } from '@/components/organisms/WebPageTable/web-page-table-client'
import { WebOptimizationAnalysisTableClient } from '@/components/organisms/WebOptimizationAnalysisTable'
import { PageHeader } from '@/components/molecules/PageHeader'
import { WorkflowStatusBanner } from '@/components/molecules/WorkflowStatusBanner'
import { useBusinessProfileById } from '@/hooks/use-business-profiles'
import { useJobByBusinessId } from '@/hooks/use-jobs'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { cn } from '@/lib/utils'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  const [activeTab, setActiveTab] = React.useState<"new-pages" | "optimize" | "settings">("new-pages")
  const [newPagesMetrics, setNewPagesMetrics] = React.useState<WebPageMetrics | null>(null)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    const tab = (searchParams.get("tab") || "").toLowerCase();
    if (tab === "new-pages" || tab === "optimize" || tab === "settings") {
      setActiveTab(tab);
      if (tab !== "optimize") {
        setIsOptimizeSplitView(false);
      }
    }
  }, [searchParams]);

  // Navigate to Settings tab when opening with ?integrations=1 (e.g. from "Connect WordPress" flows)
  React.useEffect(() => {
    if (searchParams.get("integrations") === "1") {
      setActiveTab("settings");
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("integrations");
      nextParams.set("tab", "settings");
      const newSearch = nextParams.toString();
      router.replace(`${pathname}?${newSearch}`);
    }
  }, [pathname, router, searchParams]);

  const handleTabChange = React.useCallback(
    (value: string) => {
      const nextTab = value as "new-pages" | "optimize" | "settings"
      setActiveTab(nextTab)
      if (nextTab !== "optimize") {
        setIsOptimizeSplitView(false)
      }
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.set("tab", nextTab)
      router.replace(`${pathname}?${nextParams.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const newPagesMetricsText = React.useMemo(() => {
    if (activeTab !== "new-pages") return null
    if (!newPagesMetrics) return "Loading metrics..."
    return `${formatVolume(newPagesMetrics.total_pages)} Pages and ${formatVolume(newPagesMetrics.total_supporting_keywords)} Supporting Keywords`
  }, [activeTab, newPagesMetrics])

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id))
  }, [params])

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null)
  const { data: jobDetails, isLoading: jobDetailsLoading } = useJobByBusinessId(businessId || null)
  const coreStatus = getWorkflowStatus(jobDetails, "core") ?? jobDetails?.workflow_status?.status
  const showNewPagesContent =
    !jobDetailsLoading &&
    coreStatus === "success" &&
    isWorkflowSuccess(jobDetails, "blogs_and_pages_planner")

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
              <div className="shrink-0 flex items-center justify-between gap-4">
                <TabsList>
                  <TabsTrigger value="new-pages">New Pages</TabsTrigger>
                  <TabsTrigger value="optimize">Optimize</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-3">
                  {activeTab === "new-pages" && showNewPagesContent && newPagesMetricsText && (
                    <Typography
                      variant="p"
                      className="text-sm font-mono text-general-muted-foreground"
                    >
                      {newPagesMetricsText}
                    </Typography>
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
                  workflowKey="blogs_and_pages_planner"
                  emptyStateHeight="min-h-[calc(100vh-16rem)]"
                />
              )}
            </TabsContent>
            <TabsContent value="optimize" className={cn("flex-1 min-h-0 overflow-hidden", !hideTabs && "mt-4")}>
              <EntitlementsGuard entitlement="webOptimize" businessId={businessId}>
                <WebOptimizationAnalysisTableClient businessId={businessId} onSplitViewChange={setIsOptimizeSplitView} />
              </EntitlementsGuard>
            </TabsContent>
            <TabsContent value="settings" className={cn("flex-1 min-h-0 overflow-hidden", !hideTabs && "mt-4")}>
              <div className="flex h-full flex-col gap-6 overflow-auto px-1">
                <header className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight text-general-foreground">Integrations</h2>
                  <p className="text-sm text-general-muted-foreground">
                    Connect your sites to publish and manage content from Massic.
                  </p>
                </header>
                <WebChannelsTab
                  businessId={businessId}
                  defaultSiteUrl={profileData?.Website || ""}
                  isActive={activeTab === "settings"}
                  showHeader={false}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </EntitlementsGuard>
    </div>
  )
}
