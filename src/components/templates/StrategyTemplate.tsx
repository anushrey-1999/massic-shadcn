"use client"

import React, { useMemo } from 'react'
import PageHeader from '@/components/molecules/PageHeader'
import { useBusinessStore } from '@/store/business-store'

interface StrategyTemplateProps {
  businessId: string
}

const StrategyTemplate = ({ businessId }: StrategyTemplateProps) => {
  const { profiles } = useBusinessStore()

  // Get business name from profiles
  const businessName = useMemo(() => {
    const profile = profiles.find((p) => p.UniqueId === businessId)
    return profile?.Name || profile?.DisplayName || "Business"
  }, [profiles, businessId])

  // Memoize breadcrumbs to prevent re-renders
  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Strategy", href: `/business/${businessId}/strategy` },
    ],
    [businessName, businessId]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Page Header */}
      <div className="sticky top-0 z-10 bg-background">
        <PageHeader breadcrumbs={breadcrumbs} />
      </div>

      {/* Content Area */}
      <div className="flex-1"></div>
    </div>
  )
}

export default StrategyTemplate