"use client"

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WebPageTableClient } from '@/components/organisms/WebPageTable/web-page-table-client'
import { WebOptimizationAnalysisTableClient } from '@/components/organisms/WebOptimizationAnalysisTable'
import { PageHeader } from '@/components/molecules/PageHeader'
import { useJobByBusinessId } from '@/hooks/use-jobs'
import { useBusinessProfileById } from '@/hooks/use-business-profiles'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"

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

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id))
  }, [params])

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null)

  const businessName = profileData?.Name || profileData?.DisplayName || "Business"

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Web" },
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
      <div className="container mx-auto flex-1 min-h-0 p-5 flex flex-col">
        <Tabs defaultValue="optimize" className="flex flex-col flex-1 min-h-0">
          <TabsList className="shrink-0">
            <TabsTrigger value="optimize">Optimize</TabsTrigger>
            <TabsTrigger value="new-pages">New Pages</TabsTrigger>
          </TabsList>

          <TabsContent value="optimize" className="flex-1 min-h-0 mt-4 overflow-hidden">
            <EntitlementsGuard entitlement="webOptimize" businessId={businessId}>
              <WebOptimizationAnalysisTableClient businessId={businessId} />
            </EntitlementsGuard>
          </TabsContent>

          <TabsContent value="new-pages" className="flex-1 min-h-0 mt-4 overflow-hidden">
            <EntitlementsGuard
              entitlement="web"
              businessId={businessId}
              alertMessage="You're on Starter. Upgrade your plan to unlock Web."
            >
              <WebNewPagesTab businessId={businessId} />
            </EntitlementsGuard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
