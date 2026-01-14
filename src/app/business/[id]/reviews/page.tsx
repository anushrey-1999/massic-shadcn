"use client"

import React from 'react'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { PageHeader } from "@/components/molecules/PageHeader"
import { useBusinessProfileById } from "@/hooks/use-business-profiles"
import { Typography } from "@/components/ui/typography"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function BusinessReviewsPage({ params }: PageProps) {
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
      { label: "Reviews", href: `/business/${businessId}/reviews` },
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
      {/* <PageHeader breadcrumbs={breadcrumbs} /> */}
      <EntitlementsGuard entitlement="reviews" businessId={businessId}>
        <div className="flex items-center justify-center flex-1">
          <Typography variant="h2" className="text-muted-foreground">
            Coming soon...
          </Typography>
        </div>
      </EntitlementsGuard>
    </div>
  )
}

