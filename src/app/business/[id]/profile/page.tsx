"use client"

import ProfileTemplate from '@/components/templates/ProfileTemplate'
import React, { useEffect, useRef } from 'react'
import { useBusinessProfileById, useUpdateBusinessProfile } from '@/hooks/use-business-profiles'
import { useLocations } from '@/hooks/use-locations'
import { useParams } from 'next/navigation'
import { useBusinessStore } from '@/store/business-store'

export default function BusinessProfilePage() {
  const params = useParams()
  const businessId = params?.id as string

  // Fetch business profile data
  const { 
    profileData, 
    profileDataLoading, 
    refetchProfile 
  } = useBusinessProfileById(businessId || null)

  // Fetch locations using React Query (limited to 1000 for performance)
  const { locationOptions, isLoading: locationsLoading } = useLocations("us")

  // Sync location options to Zustand store
  const { setLocationOptions, setLocationsLoading, setCurrentBusinessId } = useBusinessStore()
  const prevLocationOptionsRef = useRef<typeof locationOptions>([])
  const prevLocationsLoadingRef = useRef(locationsLoading)
  const prevBusinessIdRef = useRef(businessId)
  
  useEffect(() => {
    // Only update if locationOptions actually changed (deep comparison)
    const optionsChanged = 
      prevLocationOptionsRef.current.length !== locationOptions.length ||
      prevLocationOptionsRef.current.some((opt, idx) => 
        opt.value !== locationOptions[idx]?.value || opt.label !== locationOptions[idx]?.label
      )
    
    if (optionsChanged) {
      setLocationOptions(locationOptions)
      prevLocationOptionsRef.current = locationOptions
    }
    
    // Only update loading state if it actually changed
    if (prevLocationsLoadingRef.current !== locationsLoading) {
      setLocationsLoading(locationsLoading)
      prevLocationsLoadingRef.current = locationsLoading
    }
    
    // Only update business ID if it changed
    if (prevBusinessIdRef.current !== businessId) {
      setCurrentBusinessId(businessId || null)
      prevBusinessIdRef.current = businessId
    }
  }, [locationOptions, locationsLoading, businessId, setLocationOptions, setLocationsLoading, setCurrentBusinessId])

  // Update mutation
  const updateMutation = useUpdateBusinessProfile(businessId || null)

  // Handle update function
  const handleUpdateProfile = async (payload: any) => {
    try {
      // The mutation already handles refetching via invalidateQueries
      await updateMutation.mutateAsync(payload)
    } catch (error) {
      // Error is handled by the mutation's onError
      throw error
    }
  }

  return (
    <ProfileTemplate 
      businessId={businessId}
      profileData={profileData}
      isLoading={profileDataLoading || updateMutation.isPending}
      onUpdateProfile={handleUpdateProfile}
    />
  )
}

