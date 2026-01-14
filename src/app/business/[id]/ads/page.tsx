"use client"

import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/molecules/PageHeader'
import { WorkflowStatusBanner } from '@/components/molecules/WorkflowStatusBanner'
import { DigitalAdsTableClient } from '@/components/organisms/DigitalAdsTable'
import { TvRadioAdsTableClient } from '@/components/organisms/TvRadioAdsTable'
import { useBusinessProfileById } from '@/hooks/use-business-profiles'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { usePathname, useRouter } from 'next/navigation'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

function AdsEntitledContent({ businessId }: { businessId: string }) {
  const router = useRouter()
  const pathname = usePathname()

  const handleTabChange = React.useCallback(
    () => {
      router.replace(pathname)
    },
    [router, pathname]
  )

  return (
    <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
      <Tabs defaultValue="digital" onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0">
          <TabsTrigger value="digital">Digital</TabsTrigger>
          <TabsTrigger value="tv-radio">TV & Radio</TabsTrigger>
        </TabsList>
        <TabsContent value="digital" className="flex-1 min-h-0 mt-4 overflow-hidden">
          <DigitalAdsTableClient businessId={businessId} />
        </TabsContent>
        <TabsContent value="tv-radio" className="flex-1 min-h-0 mt-4">
          <TvRadioAdsTableClient businessId={businessId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function BusinessAdsPage({ params }: PageProps) {
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
      { label: "Ads", href: `/business/${businessId}/ads` },
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
        entitlement="ads"
        businessId={businessId}
        alertMessage="You're on Starter. Upgrade your plan to unlock Ads."
      >
        <WorkflowStatusBanner 
          businessId={businessId} 
          emptyStateHeight="h-[calc(100vh-12rem)]"
        />
        <AdsEntitledContent businessId={businessId} />
      </EntitlementsGuard>
    </div>
  )
}
