"use client"

import React, { Suspense } from 'react'
import { PageHeader } from "@/components/molecules/PageHeader"
import { useBusinessProfileById } from "@/hooks/use-business-profiles"
import { MonitoringOverviewTemplate } from "@/components/templates/MonitoringOverviewTemplate"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function BusinessMonitoringPage({ params }: PageProps) {
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
      { label: "Monitoring" },
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
        <PageHeader breadcrumbs={breadcrumbs} showAskMassic={false} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={null}>
      <MonitoringOverviewTemplate
        businessId={businessId}
        businessName={businessName}
        website={profileData?.Website}
      />
    </Suspense>
  )
}
