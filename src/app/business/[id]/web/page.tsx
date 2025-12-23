"use client"

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WebPageTableClient } from '@/components/organisms/WebPageTable/web-page-table-client'
import { WebOptimizationAnalysisTableClient } from '@/components/organisms/WebOptimizationAnalysisTable'
import { PageHeader } from '@/components/molecules/PageHeader'
import { WorkflowStatusBanner } from '@/components/molecules/WorkflowStatusBanner'
import { useJobByBusinessId } from '@/hooks/use-jobs'
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
  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null)
  const jobExists = jobDetails && jobDetails.job_id

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Checking job status...</p>
      </div>
    )
  }

  if (!jobExists) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground mb-2">No Job Found</p>
          <p className="text-muted-foreground">
            Please create a job in the profile page to view web page data.
          </p>
        </div>
      </div>
    )
  }

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
  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null)

  const businessName = profileData?.Name || profileData?.DisplayName || "Business"
  const workflowStatus = jobDetails?.workflow_status?.status
  const showContent = workflowStatus === "success"

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

  if (profileDataLoading || jobLoading) {
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
      <div className="container mx-auto flex-1 min-h-0 p-5 flex flex-col">
        <Tabs defaultValue="new-pages" onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0">
          {!isOptimizeSplitView && (
            <TabsList className="shrink-0">
              <TabsTrigger value="new-pages">New Pages</TabsTrigger>
              <TabsTrigger value="optimize">Optimize</TabsTrigger>
            </TabsList>
          )}
          <TabsContent value="new-pages" className={cn("flex-1 min-h-0 overflow-hidden flex flex-col", !isOptimizeSplitView && "mt-4")}>
            <WorkflowStatusBanner businessId={businessId} />
            {showContent ? (
              <EntitlementsGuard
                entitlement="web"
                businessId={businessId}
                alertMessage="You're on Starter. Upgrade your plan to unlock Web."
              >
                <WebNewPagesTab businessId={businessId} />
              </EntitlementsGuard>
            ) : null}
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
