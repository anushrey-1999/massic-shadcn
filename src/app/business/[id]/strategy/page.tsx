"use client"

import React from 'react'
import { StrategyTableClient } from '@/components/organisms/StrategyTable/strategy-table-client'
import { AudienceTableClient } from '@/components/organisms/AudienceTable/audience-table-client'
import { LandscapeTableClient } from '@/components/organisms/LandscapeTable/landscape-table-client'
import { PageHeader } from '@/components/molecules/PageHeader'
import { useJobByBusinessId } from '@/hooks/use-jobs'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function BusinessStrategyPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>('')

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id))
  }, [params])

  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null)
  const jobExists = jobDetails && jobDetails.job_id

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (jobLoading) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Business", href: `/business/${businessId}` },
            { label: "Strategy" },
          ]}
        />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Checking job status...</p>
        </div>
      </div>
    )
  }

  if (!jobExists) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Business", href: `/business/${businessId}` },
            { label: "Strategy" },
          ]}
        />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <p className="text-lg font-medium text-foreground mb-2">No Job Found</p>
            <p className="text-muted-foreground">
              Please create a job in the profile page to view strategy data.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <EntitlementsGuard entitlement="strategy" businessId={businessId}>
      <div className="flex flex-col h-screen">

        <PageHeader
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Business", href: `/business/${businessId}` },
            { label: "Strategy" },
          ]}
        />
        <div className="container mx-auto flex-1 min-h-0 py-5 px-4 flex flex-col">
          <Tabs defaultValue="strategy" className="flex flex-col flex-1 min-h-0">
            <TabsList className="shrink-0">
              <TabsTrigger value="strategy">Strategy</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="landscape">Landscape</TabsTrigger>
            </TabsList>
            <TabsContent value="strategy" className="flex-1 min-h-0 mt-4 overflow-hidden">
              <StrategyTableClient businessId={businessId} />
            </TabsContent>
            <TabsContent value="audience" className="flex-1 min-h-0 mt-4 overflow-hidden">
              <AudienceTableClient businessId={businessId} />
            </TabsContent>
            <TabsContent value="landscape" className="flex-1 min-h-0 mt-4 overflow-hidden">
              <LandscapeTableClient businessId={businessId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </EntitlementsGuard>

  )
}

