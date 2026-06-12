import { useMemo } from "react"
import type { BusinessProfile } from "@/store/business-store"

export type GscIngestionStatusValue =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped"
  | null

const ACTIVE_STATUSES: GscIngestionStatusValue[] = ["queued", "in_progress"]

export interface UseGscIngestionStatusResult {
  /** True when ingestion is queued or in progress — data may be incomplete. */
  isIngestionActive: boolean
  /** The raw status string from the business profile. */
  status: GscIngestionStatusValue
}

/**
 * Derives GSC ingestion state from the business profile returned by
 * useBusinessProfileById / useBusinessStore.
 *
 * Keeps the queued/in_progress check in one place so every consumer
 * stays in sync automatically.
 *
 * @example
 * const { isIngestionActive } = useGscIngestionStatus(profileData)
 */
export function useGscIngestionStatus(
  profileData: BusinessProfile | null | undefined
): UseGscIngestionStatusResult {
  return useMemo(() => {
    const status = (profileData?.GscIngestionStatus ?? null) as GscIngestionStatusValue
    const isIngestionActive = ACTIVE_STATUSES.includes(status)
    return { isIngestionActive, status }
  }, [profileData?.GscIngestionStatus])
}
