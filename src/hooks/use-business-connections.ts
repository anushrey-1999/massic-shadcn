import { useMemo } from "react"

import { useBusinessProfileById } from "@/hooks/use-business-profiles"
import type { BusinessProfile } from "@/store/business-store"

/**
 * Google integrations a business can have linked. Every Google-backed analytics
 * endpoint depends on exactly one of these being present.
 */
export type GoogleIntegration = "gsc" | "ga4" | "gbp"

export interface BusinessConnections {
  /** Search Console: a Google account is linked to the business. */
  isGscConnected: boolean
  /** Analytics: a Google account is linked and a GA4 property is mapped to the website. */
  isGa4Connected: boolean
  /** Business Profile: a Google account is linked and location data exists. */
  isGbpConnected: boolean
}

export interface BusinessConnectionsState extends BusinessConnections {
  /** True once the business profile has loaded, meaning the flags reflect real data. */
  isResolved: boolean
}

export interface GoogleDataGate {
  /** Safe to call the API: the profile resolved and the required integration is connected. */
  enabled: boolean
  /** The profile resolved and the required integration is definitively missing. */
  isBlocked: boolean
  /** Still determining connection state — neither enabled nor blocked yet. */
  isResolving: boolean
  connections: BusinessConnectionsState
}

const DISCONNECTED: BusinessConnectionsState = {
  isGscConnected: false,
  isGa4Connected: false,
  isGbpConnected: false,
  isResolved: false,
}

function hasNonEmptyLocations(locations: BusinessProfile["Locations"]): boolean {
  if (!locations) return false
  if (Array.isArray(locations)) return locations.length > 0
  if (typeof locations === "object") return Object.keys(locations).length > 0
  return Boolean(locations)
}

/**
 * Mirrors the Node API's `buildConnectionFlagsFromBusinessProfile`
 * (controllers/gsc/businessPreviewsDb.controller.js) so the client and server
 * agree on what "connected" means.
 *
 * GBP additionally requires a linked Google account here: the server-side flag
 * only tracks onboarding progress, whereas this one decides whether an API call
 * can possibly succeed.
 */
export function deriveBusinessConnections(
  profile: BusinessProfile | null | undefined
): BusinessConnections {
  const linkedAuthId = String(profile?.LinkedAuthId || "").trim()
  const propertyId = String(profile?.PropertyId || "").trim()
  const hasGoogleAuth = Boolean(linkedAuthId)
  const hasLocations =
    profile?.NoLocationExist === true || hasNonEmptyLocations(profile?.Locations)

  return {
    isGscConnected: hasGoogleAuth,
    isGa4Connected: hasGoogleAuth && Boolean(propertyId),
    isGbpConnected: hasGoogleAuth && hasLocations,
  }
}

/**
 * Connection state for a business, derived from the cached business profile.
 *
 * Reuses the `useBusinessProfileById` query, so callers share one request
 * regardless of how many hooks ask for the gate on a single page.
 */
export function useBusinessConnections(
  businessUniqueId: string | null | undefined
): BusinessConnectionsState {
  const { profileData, profileDataLoading } = useBusinessProfileById(
    businessUniqueId || null
  )

  return useMemo(() => {
    if (!businessUniqueId || profileDataLoading) return DISCONNECTED

    // A missing or failed profile resolves to "nothing connected" rather than
    // staying unresolved, so gated queries settle instead of loading forever.
    return { ...deriveBusinessConnections(profileData), isResolved: true }
  }, [businessUniqueId, profileData, profileDataLoading])
}

/**
 * Gate for a query that depends on a Google integration.
 *
 * Fails closed: `enabled` stays false until the profile resolves, so a request
 * is never fired before we know whether it can succeed.
 *
 * @example
 * const gate = useGoogleDataGate(businessId, "ga4")
 * useQuery({ enabled: gate.enabled && Boolean(siteUrl), ... })
 */
export function useGoogleDataGate(
  businessUniqueId: string | null | undefined,
  requirement: GoogleIntegration
): GoogleDataGate {
  const connections = useBusinessConnections(businessUniqueId)

  return useMemo(() => {
    const isConnected =
      requirement === "gsc"
        ? connections.isGscConnected
        : requirement === "ga4"
          ? connections.isGa4Connected
          : connections.isGbpConnected

    // Without a business there is nothing to resolve and nothing to block.
    if (!businessUniqueId) {
      return { enabled: false, isBlocked: false, isResolving: false, connections }
    }

    return {
      enabled: connections.isResolved && isConnected,
      isBlocked: connections.isResolved && !isConnected,
      isResolving: !connections.isResolved,
      connections,
    }
  }, [businessUniqueId, connections, requirement])
}

/**
 * Loading flag for a gated query.
 *
 * A disabled React Query stays `pending` forever, so consumers that read
 * `isLoading` directly would render a skeleton that never resolves. Blocked
 * means "done, nothing to show"; unresolved means "still deciding".
 */
export function resolveGatedLoading(
  gate: GoogleDataGate,
  isQueryLoading: boolean
): boolean {
  if (gate.isBlocked) return false
  if (gate.isResolving) return true
  return isQueryLoading
}

export interface GatedQueryFlags {
  /** The required Google integration is not connected, so no request was made. */
  isConnectionBlocked: boolean
}

/**
 * Wraps a query result with its gate, correcting `isLoading` and exposing
 * `isConnectionBlocked` so the UI can show a connect prompt instead of a
 * skeleton that would never resolve.
 */
export function withConnectionGate<T extends { isLoading: boolean }>(
  query: T,
  gate: GoogleDataGate
): T & GatedQueryFlags {
  return {
    ...query,
    isLoading: resolveGatedLoading(gate, query.isLoading),
    isConnectionBlocked: gate.isBlocked,
  }
}
