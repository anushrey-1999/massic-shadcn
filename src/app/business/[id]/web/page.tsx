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
import { usePathname, useRouter } from 'next/navigation'
import { Typography } from '@/components/ui/typography'
import { formatVolume } from '@/lib/format'
import type { WebPageMetrics } from '@/types/web-page-types'

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
  const [activeTab, setActiveTab] = React.useState<"new-pages" | "optimize">("new-pages")
  const [newPagesMetrics, setNewPagesMetrics] = React.useState<WebPageMetrics | null>(null)

  const router = useRouter()
  const pathname = usePathname()

  const handleTabChange = React.useCallback(
    (value: string) => {
      setActiveTab(value as "new-pages" | "optimize")
      router.replace(pathname)
    },
    [router, pathname]
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
  const workflowStatus = jobDetails?.workflow_status?.status
  const showMainContent = workflowStatus === "success"

  const businessName = profileData?.Name || profileData?.DisplayName || "Business"

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
        {!jobDetailsLoading && showMainContent ? (
          <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0">
              {!isOptimizeSplitView && (
                <div className="shrink-0 flex items-center justify-between gap-4">
                  <TabsList>
                    <TabsTrigger value="new-pages">New Pages</TabsTrigger>
                    <TabsTrigger value="optimize">Optimize</TabsTrigger>
                  </TabsList>
                  {newPagesMetricsText && (
                    <Typography
                      variant="p"
                      className="text-sm font-mono text-general-muted-foreground"
                    >
                      {newPagesMetricsText}
                    </Typography>
                  )}
                </div>
              )}
              <TabsContent value="new-pages" className={cn("flex-1 min-h-0 overflow-hidden flex flex-col", !isOptimizeSplitView && "mt-4")}>
                <WebNewPagesTab businessId={businessId} onMetricsChange={setNewPagesMetrics} />
              </TabsContent>
              <TabsContent value="optimize" className={cn("flex-1 min-h-0 overflow-hidden", !isOptimizeSplitView && "mt-4")}>
                <EntitlementsGuard entitlement="webOptimize" businessId={businessId}>
                  <WebOptimizationAnalysisTableClient businessId={businessId} onSplitViewChange={setIsOptimizeSplitView} />
                </EntitlementsGuard>
              </TabsContent>
            </Tabs>
          </div>
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
