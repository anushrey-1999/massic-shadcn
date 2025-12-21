"use client"

import React from 'react'
import { useQueryState, parseAsString } from 'nuqs'
import { SocialTableClient } from '@/components/organisms/SocialTable/social-table-client'
import { ChannelsSidebar } from '@/components/organisms/SocialTable/channels-sidebar'
import { PageHeader } from '@/components/molecules/PageHeader'
import { useJobByBusinessId } from '@/hooks/use-jobs'
import { useBusinessProfileById } from '@/hooks/use-business-profiles'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

function SocialEntitledContent({
  businessId,
  selectedChannel,
  onChannelSelect,
}: {
  businessId: string
  selectedChannel: string | null
  onChannelSelect: (channel: string | null) => void
}) {
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
            Please create a job in the profile page to view social data.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex-1 min-h-0 py-5 px-4">
      <SocialTableClient
        businessId={businessId}
        channelsSidebar={
          <ChannelsSidebar
            selectedChannel={selectedChannel}
            onChannelSelect={onChannelSelect}
          />
        }
      />
    </div>
  )
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

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null)

  const businessName = profileData?.Name || profileData?.DisplayName || "Business"

  const breadcrumbs = React.useMemo(() => {
    const baseBreadcrumbs = [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Social" },
    ]
    if (campaignName) {
      baseBreadcrumbs.push({ label: campaignName })
    }
    return baseBreadcrumbs
  }, [businessName, campaignName])

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
        <PageHeader
          breadcrumbs={breadcrumbs}
        />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        breadcrumbs={breadcrumbs}
      />
      <EntitlementsGuard
        entitlement="content"
        businessId={businessId}
        alertMessage="Upgrade your plan to unlock Social content generation."
      >
        <SocialEntitledContent
          businessId={businessId}
          selectedChannel={selectedChannel || null}
          onChannelSelect={(channel) => setSelectedChannel(channel)}
        />
      </EntitlementsGuard>
    </div>
  )
}
