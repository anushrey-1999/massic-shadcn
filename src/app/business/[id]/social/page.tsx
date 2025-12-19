"use client"

import React from 'react'
import { useQueryState, parseAsString } from 'nuqs'
import { SocialTableClient } from '@/components/organisms/SocialTable/social-table-client'
import { ChannelsSidebar } from '@/components/organisms/SocialTable/channels-sidebar'
import { PageHeader } from '@/components/molecules/PageHeader'
import { useJobByBusinessId } from '@/hooks/use-jobs'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function BusinessSocialPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>('')
  const [selectedChannel, setSelectedChannel] = useQueryState(
    "channel_name",
    parseAsString
  )
  const [campaignName] = useQueryState(
    "campaign_name",
    parseAsString
  )

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id))
  }, [params])

  const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(businessId || null)
  const jobExists = jobDetails && jobDetails.job_id

  const breadcrumbs = React.useMemo(() => {
    const baseBreadcrumbs = [
      { label: "Home", href: "/" },
      { label: "Business", href: businessId ? `/business/${businessId}` : undefined },
      { label: "Social" },
    ]
    if (campaignName) {
      baseBreadcrumbs.push({ label: campaignName })
    }
    return baseBreadcrumbs
  }, [businessId, campaignName])

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
          breadcrumbs={breadcrumbs}
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
          breadcrumbs={breadcrumbs}
        />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <p className="text-lg font-medium text-foreground mb-2">No Job Found</p>
            <p className="text-muted-foreground">
              Please create a job in the profile page to view social data.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        breadcrumbs={breadcrumbs}
      />
      <div className="container mx-auto flex-1 min-h-0 py-5 px-4">
        <SocialTableClient
          businessId={businessId}
          channelsSidebar={
            <ChannelsSidebar
              selectedChannel={selectedChannel || null}
              onChannelSelect={(channel) => setSelectedChannel(channel)}
            />
          }
        />
      </div>
    </div>
  )
}
