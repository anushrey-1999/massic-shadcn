"use client"

import ProfileTemplate from '@/components/templates/ProfileTemplate'
import React, { useEffect, useRef, useMemo } from 'react'
import { useBusinessProfileById, useUpdateBusinessProfile } from '@/hooks/use-business-profiles'
import { useLocations } from '@/hooks/use-locations'
import { useParams } from 'next/navigation'
import { useBusinessStore } from '@/store/business-store'
import { useJobByBusinessId, useCreateJob, useUpdateJob, type Offering } from '@/hooks/use-jobs'

export default function BusinessProfilePage() {
  const params = useParams()
  const businessId = params?.id as string

  // Fetch business profile data
  const {
    profileData,
    profileDataLoading,
    refetchProfile
  } = useBusinessProfileById(businessId || null)

  // Check job existence on page load - only used for offerings data
  // Business API is source of truth for all other fields
  // React Query automatically fetches job details when component mounts
  const {
    data: jobDetails,
    isLoading: jobDetailsLoading,
    refetch: refetchJob
  } = useJobByBusinessId(businessId || null)

  // Refetch job details on mount to get latest workflow status
  useEffect(() => {
    if (businessId) {
      refetchJob()
    }
  }, [businessId, refetchJob])

  // Sync job API USPs to business API on mount
  useEffect(() => {
    const syncUspsOnMount = async () => {
      if (!jobDetails || !profileData || !businessId) return

      const normalizeUsps = (raw: unknown): string[] => {
        if (!raw) return []
        if (Array.isArray(raw)) {
          return raw.map((item) => String(item).trim()).filter(Boolean)
        }
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              return parsed.map((item) => String(item).trim()).filter(Boolean)
            }
          } catch {
            // ignore
          }
          return raw.split(",").map((item) => item.trim()).filter(Boolean)
        }
        return []
      }

      const jobUsps = normalizeUsps((jobDetails as any)?.usps ?? (jobDetails as any)?.USPs)
      const businessUsps = normalizeUsps((profileData as any)?.USPs ?? (profileData as any)?.SellingPoints)

      // Only sync if job has USPs and they differ from business API
      if (jobUsps.length > 0 && JSON.stringify(jobUsps) !== JSON.stringify(businessUsps)) {
        try {
          await updateBusinessProfileMutation.mutateAsync({
            ...profileData,
            USPs: jobUsps,
            SellingPoints: jobUsps,
          })
          await refetchProfile()
        } catch (error) {
          console.error("Failed to sync USPs on mount:", error)
        }
      }
    }

    syncUspsOnMount()
  }, [jobDetails, profileData, businessId])

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

  // Update mutations
  const updateBusinessProfileMutation = useUpdateBusinessProfile(businessId || null)
  const createJobMutation = useCreateJob()
  const updateJobMutation = useUpdateJob()

  // SIMPLIFIED FLOW:
  // - Business API is source of truth for all fields (always update it)
  // - Job API only stores offerings + syncs same data to maintain consistency
  // - Always update both APIs when job exists to keep them in sync
  const handleUpdateProfile = async (payload: any, formValues?: any) => {
    if (!businessId) {
      throw new Error("Business ID is required")
    }

    const normalizeUsps = (raw: unknown): string[] => {
      if (!raw) return []
      if (Array.isArray(raw)) {
        return raw.map((item) => String(item).trim()).filter(Boolean)
      }
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            return parsed.map((item) => String(item).trim()).filter(Boolean)
          }
        } catch {
          // ignore
        }
        return raw
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      }
      return []
    }

    const normalizeOfferings = (raw: any): Offering[] => {
      if (!Array.isArray(raw)) return []
      return raw
        .map((offering: any) => ({
          name: String(offering?.offering ?? offering?.name ?? "").trim(),
          description: String(offering?.description ?? "").trim(),
          link: String(offering?.url ?? offering?.link ?? "").trim(),
        }))
        .filter((offering) => Boolean(offering.name))
    }

    const mergeUsps = (base: string[], extra: string[]) =>
      Array.from(new Set([...base, ...extra]))

    const syncBusinessUspsFromJob = async (usps: string[], basePayload: any) => {
      if (usps.length === 0) return

      await updateBusinessProfileMutation.mutateAsync({
        ...basePayload,
        USPs: usps,
        SellingPoints: usps,
      })
    }

    try {
      // Step 1: Check if job exists and if user has filled offerings
      const jobExists = jobDetails && jobDetails.job_id
      const normalizedOfferings: Offering[] = Array.isArray(formValues?.offeringsList)
        ? (formValues.offeringsList as any[])
          .filter((offering) => Boolean(offering?.name?.trim()))
          .map((offering: any) => ({
            name: offering.name || "",
            description: offering.description || "",
            link: offering.link || "",
          }))
        : []
      const jobOfferings = normalizeOfferings(jobDetails?.offerings)
      const offeringsChanged =
        !jobExists || JSON.stringify(normalizedOfferings) !== JSON.stringify(jobOfferings)
      const hasOfferings = normalizedOfferings.length > 0

      // Step 2: ALWAYS update Business Profile API first (source of truth)
      // Remove offerings from payload (offerings are only in job API, not business API)
      const { ProductsServices, ...businessPayload } = payload
      const jobUsps = normalizeUsps(jobDetails?.usps ?? jobDetails?.USPs)
      const businessPayloadWithUsps = {
        ...businessPayload,
        USPs: jobUsps.length > 0 ? jobUsps : null,
        SellingPoints: jobUsps.length > 0 ? jobUsps : null,
      }
      await updateBusinessProfileMutation.mutateAsync(businessPayloadWithUsps)

      // Step 3: Handle Job API - sync data to maintain consistency
      if (jobExists) {
        // Job exists - ALWAYS update both APIs to keep them in sync
        if (formValues) {
          const offerings = normalizedOfferings

          // Convert CTAs array to the format expected by job API ({ value: JSON.stringify(...) })
          const ctasArray = businessPayload.CTAs || []
          const payloadWithCTAs = {
            ...businessPayloadWithUsps,
            CTAs: Array.isArray(ctasArray) && ctasArray.length > 0
              ? {
                value: JSON.stringify(
                  ctasArray.map((cta: any) => ({
                    buttonText: cta.buttonText || "",
                    url: cta.url || "",
                  }))
                ),
              }
              : null,
          }

          // Update job API with same data to maintain sync
          await updateJobMutation.mutateAsync({
            businessId,
            businessProfilePayload: payloadWithCTAs,
            offerings,
            includeOfferings: offeringsChanged,
          })

          const refreshedJob = await refetchJob()
          const refreshedUsps = normalizeUsps(
            refreshedJob?.data?.usps ?? refreshedJob?.data?.USPs
          )

          if (refreshedUsps.length > 0) {
            await syncBusinessUspsFromJob(refreshedUsps, businessPayloadWithUsps)
          }

          // Refresh job details after update
          await refetchJob()
        }
      } else {
        // No job exists - create job ONLY if user has filled offerings
        // If user changes other fields but offerings are empty → NO job creation
        // If user fills offerings and saves → CREATE job
        if (hasOfferings && formValues) {
          const offerings = normalizedOfferings

          // Convert CTAs array to the format expected by job API ({ value: JSON.stringify(...) })
          const ctasArray = businessPayload.CTAs || []
          const payloadWithCTAs = {
            ...businessPayloadWithUsps,
            CTAs: Array.isArray(ctasArray) && ctasArray.length > 0
              ? {
                value: JSON.stringify(
                  ctasArray.map((cta: any) => ({
                    buttonText: cta.buttonText || "",
                    url: cta.url || "",
                  }))
                ),
              }
              : null,
          }

          // Create job with same data from business API to maintain sync
          await createJobMutation.mutateAsync({
            businessId,
            businessProfilePayload: payloadWithCTAs,
            offerings,
          })

          const refreshedJob = await refetchJob()
          const refreshedUsps = normalizeUsps(
            refreshedJob?.data?.usps ?? refreshedJob?.data?.USPs
          )

          if (refreshedUsps.length > 0) {
            await syncBusinessUspsFromJob(refreshedUsps, businessPayloadWithUsps)
          }

          // Refresh job details after creation
          await refetchJob()
        } else {
          // No job exists and no offerings filled - only update business API
        }
      }

      // Step 4: Refresh data in background with slight delay to ensure server has processed updates
      setTimeout(() => {
        refetchProfile()
        // Always refetch job details after save to get latest job existence status
        refetchJob()
      }, 1000)
    } catch (error) {
      // Error is handled by the mutations' onError
      throw error
    }
  }

  const isLoading = useMemo(() => {
    return (
      profileDataLoading ||
      jobDetailsLoading ||
      updateBusinessProfileMutation.isPending ||
      createJobMutation.isPending ||
      updateJobMutation.isPending
    )
  }, [
    profileDataLoading,
    jobDetailsLoading,
    updateBusinessProfileMutation.isPending,
    createJobMutation.isPending,
    updateJobMutation.isPending,
  ])

  return (
    <ProfileTemplate
      key={`${businessId}-${profileData ? "ready" : "loading"}`}
      businessId={businessId}
      profileData={profileData}
      jobDetails={jobDetails}
      isLoading={isLoading}
      onUpdateProfile={handleUpdateProfile}
    />
  )
}

