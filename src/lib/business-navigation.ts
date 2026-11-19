import { webArchitectureTabEnabled } from '@/config/web-page-features'

const ANALYTICS_ROUTE_SEGMENTS = [
  'analytics',
  'monitoring',
  'indexing',
  'organic-deepdive',
  'reports',
] as const
const PROFILE_ROUTE_SEGMENTS = ['profile'] as const
const FREE_BUSINESS_ROUTE_SEGMENTS = [
  'analytics',
  'indexing',
  'organic-deepdive',
  'profile',
] as const
const FREE_BUSINESS_EXCLUDED_SEGMENTS = ['analytics/campaigns'] as const

function isPathWithin(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

export function isBusinessAnalyticsRoute(pathname: string, businessId: string) {
  return ANALYTICS_ROUTE_SEGMENTS.some((segment) =>
    isPathWithin(pathname, `/business/${businessId}/${segment}`)
  )
}

/** Pages a free business account can open; everything else is agency-only. */
export function isFreeBusinessRoute(pathname: string, businessId: string) {
  const within = (segment: string) =>
    isPathWithin(pathname, `/business/${businessId}/${segment}`)
  return (
    FREE_BUSINESS_ROUTE_SEGMENTS.some(within) &&
    !FREE_BUSINESS_EXCLUDED_SEGMENTS.some(within)
  )
}

export function isBusinessProfileRoute(pathname: string, businessId: string) {
  return PROFILE_ROUTE_SEGMENTS.some((segment) =>
    isPathWithin(pathname, `/business/${businessId}/${segment}`)
  )
}

export function businessWebHref(businessId: string) {
  const path = webArchitectureTabEnabled ? 'web/v2' : 'web'
  return `/business/${businessId}/${path}`
}
