"use client"

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WebPageTableClient } from '@/components/organisms/WebPageTable/web-page-table-client'
import { WebOptimizationAnalysisTableClient } from '@/components/organisms/WebOptimizationAnalysisTable'
import { PageHeader } from '@/components/molecules/PageHeader'
import { useJobByBusinessId } from '@/hooks/use-jobs'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function BusinessWebPage({ params }: PageProps) {
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
            { label: "Web" },
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
            { label: "Web" },
          ]}
        />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <p className="text-lg font-medium text-foreground mb-2">No Job Found</p>
            <p className="text-muted-foreground">
              Please create a job in the profile page to view web page data.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Business", href: `/business/${businessId}` },
          { label: "Web" },
        ]}
      />
      <div className="container mx-auto flex-1 min-h-0 py-5 px-4 flex flex-col">
        <Tabs defaultValue="new-pages" className="flex flex-col flex-1 min-h-0">
          <TabsList className="shrink-0">
            <TabsTrigger value="new-pages">New Pages</TabsTrigger>
            <TabsTrigger value="optimize">Optimize</TabsTrigger>
          </TabsList>
          <TabsContent value="new-pages" className="flex-1 min-h-0 mt-4 overflow-hidden">
            <WebPageTableClient businessId={businessId} />
          </TabsContent>
          <TabsContent value="optimize" className="flex-1 min-h-0 mt-4 overflow-hidden">
            <WebOptimizationAnalysisTableClient businessId={businessId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
