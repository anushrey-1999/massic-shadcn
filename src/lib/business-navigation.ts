const ANALYTICS_ROUTE_SEGMENTS = [
  'analytics',
  'indexing',
  'organic-deepdive',
  'reports',
] as const
const PROFILE_ROUTE_SEGMENTS = ['profile', 'customer-agent'] as const

function isPathWithin(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

export function isBusinessAnalyticsRoute(pathname: string, businessId: string) {
  return ANALYTICS_ROUTE_SEGMENTS.some((segment) =>
    isPathWithin(pathname, `/business/${businessId}/${segment}`)
  )
}

export function isBusinessProfileRoute(pathname: string, businessId: string) {
  return PROFILE_ROUTE_SEGMENTS.some((segment) =>
    isPathWithin(pathname, `/business/${businessId}/${segment}`)
  )
}
