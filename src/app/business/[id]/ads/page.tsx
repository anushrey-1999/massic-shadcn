"use client"

import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/molecules/PageHeader'
import { DigitalAdsTableClient } from '@/components/organisms/DigitalAdsTable'
import { useJobByBusinessId } from '@/hooks/use-jobs'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function BusinessAdsPage({ params }: PageProps) {
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
            { label: "Ads" },
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
            { label: "Ads" },
          ]}
        />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <p className="text-lg font-medium text-foreground mb-2">No Job Found</p>
            <p className="text-muted-foreground">
              Please create a job in the profile page to view ads data.
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
          { label: "Ads" },
        ]}
      />
      <div className="container mx-auto flex-1 min-h-0 py-5 px-4 flex flex-col">
        <Tabs defaultValue="digital" className="flex flex-col flex-1 min-h-0">
          <TabsList className="shrink-0">
            <TabsTrigger value="digital">Digital</TabsTrigger>
            <TabsTrigger value="tv-radio">TV & Radio</TabsTrigger>
          </TabsList>
          <TabsContent value="digital" className="flex-1 min-h-0 mt-4 overflow-hidden">
            <DigitalAdsTableClient businessId={businessId} />
          </TabsContent>
          <TabsContent value="tv-radio" className="flex-1 min-h-0 mt-4">
            <div className="p-4">
              <p className="text-muted-foreground">TV & Radio ads content</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
