"use client"

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WebPageTableClient } from '@/components/organisms/WebPageTable/web-page-table-client'
import { WebOptimizationAnalysisTableClient } from '@/components/organisms/WebOptimizationAnalysisTable'
import { PageHeader } from '@/components/molecules/PageHeader'
import { WorkflowStatusBanner } from '@/components/molecules/WorkflowStatusBanner'
import { useBusinessProfileById } from '@/hooks/use-business-profiles'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { cn } from '@/lib/utils'
import { usePathname, useRouter } from 'next/navigation'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

function WebNewPagesTab({ businessId }: { businessId: string }) {
  return <WebPageTableClient businessId={businessId} />
}

export default function BusinessWebPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>('')
  const [isOptimizeSplitView, setIsOptimizeSplitView] = React.useState(false)

  const router = useRouter()
  const pathname = usePathname()

  const handleTabChange = React.useCallback(
    () => {
      router.replace(pathname)
    },
    [router, pathname]
  )

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id))
  }, [params])

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null)

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
      <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
        <Tabs defaultValue="new-pages" onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0">
          {!isOptimizeSplitView && (
            <TabsList className="shrink-0">
              <TabsTrigger value="new-pages">New Pages</TabsTrigger>
              <TabsTrigger value="optimize">Optimize</TabsTrigger>
            </TabsList>
          )}
          <TabsContent value="new-pages" className={cn("flex-1 min-h-0 overflow-hidden flex flex-col", !isOptimizeSplitView && "mt-4")}>
            <EntitlementsGuard
              entitlement="web"
              businessId={businessId}
              alertMessage="You're on Starter. Upgrade your plan to unlock Web."
            >
              <WorkflowStatusBanner 
                businessId={businessId} 
                emptyStateHeight="h-[calc(100vh-16rem)]"
              />
              <WebNewPagesTab businessId={businessId} />
            </EntitlementsGuard>
          </TabsContent>
          <TabsContent value="optimize" className={cn("flex-1 min-h-0 overflow-hidden", !isOptimizeSplitView && "mt-4")}>
            <EntitlementsGuard entitlement="webOptimize" businessId={businessId}>
              <WebOptimizationAnalysisTableClient businessId={businessId} onSplitViewChange={setIsOptimizeSplitView} />
            </EntitlementsGuard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
