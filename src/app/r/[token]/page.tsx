"use client"

import * as React from "react"
import { AlertCircle, ArrowRight, Star } from "lucide-react"
import { useParams } from "next/navigation"
import { api } from "@/hooks/use-api"
import { normalizeDomainForFavicon } from "@/utils/utils"

const FAVICON_URL = "https://www.google.com/s2/favicons?domain="

type ResolveResponse = {
  err: boolean
  data?: {
    targetUrl?: string | null
    businessName?: string | null
    businessWebsite?: string | null
  }
  message?: string
}

function BusinessFavicon({
  website,
  businessName,
  isLoading,
}: {
  website?: string | null
  businessName?: string | null
  isLoading: boolean
}) {
  const [imgError, setImgError] = React.useState(false)
  const normalizedDomain = normalizeDomainForFavicon(website || undefined)
  const fallbackInitial = businessName?.trim().charAt(0).toUpperCase() || "M"

  if (isLoading) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="h-6 w-6 rounded-full border-2 border-neutral-200 border-t-neutral-900 animate-spin" />
      </div>
    )
  }

  if (!normalizedDomain || imgError) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white text-lg font-semibold text-neutral-700 shadow-sm">
        {fallbackInitial}
      </div>
    )
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
      <img
        src={`${FAVICON_URL}${normalizedDomain}&sz=96`}
        alt=""
        width={40}
        height={40}
        className="h-full w-full object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  )
}

export default function ReviewRedirectPage() {
  const params = useParams<{ token?: string }>()
  const token = params?.token
  const [businessName, setBusinessName] = React.useState<string | null>(null)
  const [businessWebsite, setBusinessWebsite] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isResolving, setIsResolving] = React.useState(true)

  React.useEffect(() => {
    if (!token) {
      setError("This review link is missing a token.")
      return
    }
    const resolvedToken = token

    let redirectTimer: ReturnType<typeof setTimeout> | undefined

    async function resolveLink() {
      try {
        const payload = await api.get<ResolveResponse>(
          `/r/${encodeURIComponent(resolvedToken)}/resolve`,
          "node",
          {
            headers: { Accept: "application/json" },
          }
        )

        if (payload.err || !payload.data?.targetUrl) {
          throw new Error(payload.message || "This review link is no longer available.")
        }

        setBusinessName(payload.data.businessName || null)
        setBusinessWebsite(payload.data.businessWebsite || null)

        redirectTimer = setTimeout(() => {
          window.location.replace(payload.data?.targetUrl || "/")
        }, 950)
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "We could not open this review link."
        )
      } finally {
        setIsResolving(false)
      }
    }

    resolveLink()

    return () => {
      if (redirectTimer) clearTimeout(redirectTimer)
    }
  }, [token])

  const title = businessName ? `Opening ${businessName}` : "Opening review page"

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f3ef] px-6 text-neutral-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(247,243,239,0)_42%),linear-gradient(135deg,_rgba(255,255,255,0.9),_rgba(242,236,229,0.86))]" />
      <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 blur-3xl" />

      <section className="relative w-full max-w-sm rounded-[2rem] border border-white/80 bg-white/78 p-7 text-center shadow-[0_24px_80px_rgba(65,50,38,0.14)] backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-neutral-950/[0.03]">
          <div className="redirect-orbit relative flex h-20 w-20 items-center justify-center rounded-full">
            <div className="redirect-ring absolute inset-0 rounded-full border border-neutral-900/10" />
            <div className="redirect-icon-lift relative">
              {error ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600 shadow-sm">
                  <AlertCircle className="h-6 w-6" />
                </div>
              ) : (
                <BusinessFavicon
                  website={businessWebsite}
                  businessName={businessName}
                  isLoading={isResolving}
                />
              )}
            </div>
          </div>
        </div>

        {error ? (
          <>
            <p className="mb-2 text-base font-semibold">This link could not be opened</p>
            <p className="mx-auto max-w-[260px] text-sm leading-6 text-neutral-500">
              {error}
            </p>
          </>
        ) : (
          <>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              <Star className="h-3 w-3 fill-neutral-900 text-neutral-900" />
              Review
            </div>
            <h1 className="text-balance text-2xl font-semibold tracking-[-0.04em]">
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-[270px] text-sm leading-6 text-neutral-500">
              Taking you to the review page. Thanks for sharing your feedback.
            </p>

            <div className="mt-7 overflow-hidden rounded-full bg-neutral-950/[0.07]">
              <div className="redirect-progress h-1.5 rounded-full bg-neutral-950" />
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-neutral-400">
              Redirecting
              <ArrowRight className="redirect-arrow h-3.5 w-3.5" />
            </div>
          </>
        )}
      </section>

      <style>{`
        @keyframes redirectRing {
          0% { transform: scale(0.82); opacity: 0.44; }
          70% { transform: scale(1.18); opacity: 0; }
          100% { transform: scale(1.18); opacity: 0; }
        }

        @keyframes redirectLift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes redirectProgress {
          0% { transform: translateX(-96%) scaleX(0.22); }
          55% { transform: translateX(-20%) scaleX(0.72); }
          100% { transform: translateX(0) scaleX(1); }
        }

        @keyframes redirectArrow {
          0%, 100% { transform: translateX(0); opacity: 0.42; }
          50% { transform: translateX(4px); opacity: 0.88; }
        }

        .redirect-ring {
          animation: redirectRing 1.65s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
        }

        .redirect-icon-lift {
          animation: redirectLift 2s ease-in-out infinite;
        }

        .redirect-progress {
          transform-origin: left center;
          animation: redirectProgress 1.15s cubic-bezier(0.33, 1, 0.68, 1) forwards;
        }

        .redirect-arrow {
          animation: redirectArrow 1.1s ease-in-out infinite;
        }
      `}</style>
    </main>
  )
}
