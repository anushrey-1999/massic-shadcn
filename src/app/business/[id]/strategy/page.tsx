"use client"

import React from 'react'
import { StrategyTableClient } from '@/components/organisms/StrategyTable/strategy-table-client'
import { AudienceTableClient } from '@/components/organisms/AudienceTable/audience-table-client'
import { LandscapeTableClient } from '@/components/organisms/LandscapeTable/landscape-table-client'
import { PageHeader } from '@/components/molecules/PageHeader'
import { WorkflowStatusBanner } from '@/components/molecules/WorkflowStatusBanner'
import { useJobByBusinessId } from '@/hooks/use-jobs'
import { useBusinessProfileById } from '@/hooks/use-business-profiles'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

function StrategyEntitledContent({ businessId }: { businessId: string }) {
  const [isStrategySplitView, setIsStrategySplitView] = React.useState(false)
  const [isAudienceSplitView, setIsAudienceSplitView] = React.useState(false)

  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null)
  const jobExists = jobDetails && jobDetails.job_id

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-muted-foreground">Checking job status...</p>
      </div>
    )
  }

  if (!jobExists) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground mb-2">No Job Found</p>
          <p className="text-muted-foreground">
            Please create a job in the profile page to view strategy data.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex-1 min-h-0 p-5 flex flex-col">
      <Tabs defaultValue="strategy" className="flex flex-col flex-1 min-h-0">
        {!(isStrategySplitView || isAudienceSplitView) && (
          <TabsList className="shrink-0">
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="landscape">Landscape</TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="strategy" className={cn("flex-1 min-h-0 overflow-hidden", !(isStrategySplitView || isAudienceSplitView) && "mt-4")}>
          <StrategyTableClient businessId={businessId} onSplitViewChange={setIsStrategySplitView} />
        </TabsContent>
        <TabsContent value="audience" className={cn("flex-1 min-h-0 overflow-hidden", !(isStrategySplitView || isAudienceSplitView) && "mt-4")}>
          <AudienceTableClient businessId={businessId} onSplitViewChange={setIsAudienceSplitView} />
        </TabsContent>
        <TabsContent value="landscape" className={cn("flex-1 min-h-0 overflow-hidden", !(isStrategySplitView || isAudienceSplitView) && "mt-4")}>
          <LandscapeTableClient businessId={businessId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function BusinessStrategyPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>('')

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id))
  }, [params])

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null)
  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null)

  const businessName = profileData?.Name || profileData?.DisplayName || "Business"
  const workflowStatus = jobDetails?.workflow_status?.status
  const showContent = workflowStatus === "success"
  const showBanner = workflowStatus === "processing" || workflowStatus === "error"

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Strategy" },
    ],
    [businessName]
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
      {showBanner && (
        <div className="container mx-auto px-5 pt-5">
          <WorkflowStatusBanner businessId={businessId} />
        </div>
      )}
      {showContent && (
        <EntitlementsGuard entitlement="strategy" businessId={businessId}>
          <StrategyEntitledContent businessId={businessId} />
        </EntitlementsGuard>
      )}
    </div>

  )
}

