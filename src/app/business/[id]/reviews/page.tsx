"use client"

import React from 'react'
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { PageHeader } from "@/components/molecules/PageHeader"
import { useBusinessProfileById } from "@/hooks/use-business-profiles"

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
      { label: "Reviews" },
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
      <EntitlementsGuard entitlement="reviews" businessId={businessId}>
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Reviews - {businessId}</h1>
          <p className="text-muted-foreground">Reviews page for {businessId}</p>
        </div>
      </EntitlementsGuard>
    </div>
  )
}

