export type ReviewPlatformId =
  | "google"
  | "yelp"
  | "facebook"
  | "tripadvisor"
  | "trustpilot"
  | "bbb"
  | "unknown"

export type ReviewPlatformMeta = {
  id: ReviewPlatformId
  label: string
  faviconDomain: string
}

const REVIEW_PLATFORMS: ReviewPlatformMeta[] = [
  {
    id: "google",
    label: "Google Reviews",
    faviconDomain: "google.com",
  },
  {
    id: "yelp",
    label: "Yelp",
    faviconDomain: "yelp.com",
  },
  {
    id: "facebook",
    label: "Facebook",
    faviconDomain: "facebook.com",
  },
  {
    id: "tripadvisor",
    label: "Tripadvisor",
    faviconDomain: "tripadvisor.com",
  },
  {
    id: "trustpilot",
    label: "Trustpilot",
    faviconDomain: "trustpilot.com",
  },
  {
    id: "bbb",
    label: "Better Business Bureau",
    faviconDomain: "bbb.org",
  },
]

const PLATFORM_DOMAIN_MATCHERS: { id: ReviewPlatformId; domains: string[] }[] = [
  { id: "google", domains: ["google.com", "g.page", "goo.gl", "maps.google.com"] },
  { id: "yelp", domains: ["yelp.com"] },
  { id: "facebook", domains: ["facebook.com", "fb.com"] },
  { id: "tripadvisor", domains: ["tripadvisor.com"] },
  { id: "trustpilot", domains: ["trustpilot.com"] },
  { id: "bbb", domains: ["bbb.org"] },
]

export function getReviewPlatformMeta(platformId: ReviewPlatformId | null | undefined) {
  if (!platformId) return null
  return REVIEW_PLATFORMS.find((platform) => platform.id === platformId) || null
}

export function getReviewPlatformIdFromUrl(url?: string | null): ReviewPlatformId {
  if (!url) return "unknown"

  let hostname = ""
  try {
    const parsed = new URL(url)
    hostname = parsed.hostname.toLowerCase()
  } catch {
    hostname = String(url).toLowerCase()
  }

  const match = PLATFORM_DOMAIN_MATCHERS.find((platform) =>
    platform.domains.some((domain) => hostname.includes(domain))
  )

  return match?.id || "unknown"
}

export function getReviewPlatformIconUrl(platformId: ReviewPlatformId | null | undefined) {
  const meta = getReviewPlatformMeta(platformId)
  const domain = meta?.faviconDomain || "google.com"
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}

export function getReviewPlatformLabel(platformId: ReviewPlatformId | null | undefined) {
  const meta = getReviewPlatformMeta(platformId)
  return meta?.label || "Review"
}

export function getReviewPlatformFromUrl(url?: string | null) {
  const id = getReviewPlatformIdFromUrl(url)
  return {
    id,
    label: getReviewPlatformLabel(id),
    iconUrl: getReviewPlatformIconUrl(id),
    meta: getReviewPlatformMeta(id),
  }
}
