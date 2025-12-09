'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { useBusinessProfiles } from '@/hooks/use-business-profiles'
import { TopicsTableClient } from '@/components/topics/topics-table-client'

const SINGLE_BUSINESS_ROLE_ID = 4

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Loading your business...</p>
      </div>
    </div>
  )
}

function useSingleBusinessRedirect() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { profiles, sidebarDataLoading } = useBusinessProfiles()

  const isSingleBusinessUser = user?.roleid === SINGLE_BUSINESS_ROLE_ID
  const isReady = isAuthenticated && !sidebarDataLoading

  useEffect(() => {
    if (!isReady || !isSingleBusinessUser) return

    const redirectPath = profiles.length > 0
      ? `/business/${profiles[0].UniqueId}/analytics`
      : '/settings'

    router.replace(redirectPath)
  }, [isReady, isSingleBusinessUser, profiles, router])

  return { isSingleBusinessUser, isRedirecting: isSingleBusinessUser }
}

export default function HomePage() {
  const { isRedirecting } = useSingleBusinessRedirect()

  if (isRedirecting) {
    return <LoadingSpinner />
  }

  return (
    <div className="bg-muted p-8 flex flex-col gap-8 min-h-full">
      <TopicsTableClient />
    </div>
  )
}


