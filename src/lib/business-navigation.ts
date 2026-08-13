const ANALYTICS_ROUTE_SEGMENTS = [
  'analytics',
  'indexing',
  'organic-deepdive',
  'reports',
] as const

function isPathWithin(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

export function isBusinessAnalyticsRoute(pathname: string, businessId: string) {
  return ANALYTICS_ROUTE_SEGMENTS.some((segment) =>
    isPathWithin(pathname, `/business/${businessId}/${segment}`)
  )
}
