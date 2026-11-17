'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { useBusinessProfiles } from '@/hooks/use-business-profiles'
import { HomeTemplate } from '@/components/templates/HomeTemplate'
import { useSignupStore } from '@/store/signup-store'
import { USER_ROLE_IDS } from '@/lib/user-roles'

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
  const { step, setStep, setBusinessId } = useSignupStore()

  const isSingleBusinessUser = user?.roleid === USER_ROLE_IDS.BUSINESS
  const isReady = isAuthenticated && !sidebarDataLoading

  useEffect(() => {
    if (!isReady || !isSingleBusinessUser) return

    const onboardingActive = step !== 'initial'
    if (onboardingActive) {
      if (profiles[0]?.UniqueId) {
        setBusinessId(profiles[0].UniqueId)
        if (step === 'creatingBusiness') setStep('connectSources')
      } else if (step !== 'businessDetails' && step !== 'creatingBusiness') {
        setStep('businessDetails')
      }
      router.replace('/signup')
      return
    }

    if (profiles.length === 0) {
      setStep('businessDetails')
      router.replace('/signup')
      return
    }

    router.replace(`/business/${profiles[0].UniqueId}/analytics`)
  }, [
    isReady,
    isSingleBusinessUser,
    profiles,
    router,
    setBusinessId,
    setStep,
    step,
  ])

  return { isSingleBusinessUser, isRedirecting: isSingleBusinessUser }
}

export default function HomePage() {
  const { isRedirecting } = useSingleBusinessRedirect()

  if (isRedirecting) {
    return <LoadingSpinner />
  }

  return <HomeTemplate />
}


