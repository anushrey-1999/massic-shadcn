"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

const MAX_RETRIES = 1

/** Statuses worth retrying despite being 4xx: the server asked us to wait. */
const RETRYABLE_CLIENT_STATUSES = new Set([408, 429])

function getStatus(error: unknown): number | undefined {
  const candidate = error as { response?: { status?: number }; status?: number }
  return candidate?.response?.status ?? candidate?.status
}

/**
 * Retries transient failures only.
 *
 * A 4xx is the server stating the request itself is wrong, so repeating it
 * cannot succeed — it just doubles the console noise and the load.
 */
export function shouldRetryRequest(failureCount: number, error: unknown): boolean {
  const status = getStatus(error)

  if (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    !RETRYABLE_CLIENT_STATUSES.has(status)
  ) {
    return false
  }

  return failureCount < MAX_RETRIES
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 1 minute by default
            staleTime: 60 * 1000,
            // Cached data is kept for 15 minutes by default
            gcTime: 15 * 60 * 1000,
            // Refetch whenever the user returns to the tab/window
            refetchOnWindowFocus: false,
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
            // Refetch when network reconnects (good for offline support)
            refetchOnReconnect: true,
            retry: shouldRetryRequest,
            // Retry delay with exponential backoff
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Structural sharing prevents unnecessary re-renders
            structuralSharing: true,
          },
          mutations: {
            retry: shouldRetryRequest,
            // Retry delay
            retryDelay: 1000,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
