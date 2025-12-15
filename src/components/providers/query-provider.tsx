"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

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
            // Don't refetch on window focus (better UX for data-heavy apps)
            refetchOnWindowFocus: false,
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
            // Refetch when network reconnects (good for offline support)
            refetchOnReconnect: true,
            // Retry failed requests once
            retry: 1,
            // Retry delay with exponential backoff
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Structural sharing prevents unnecessary re-renders
            structuralSharing: true,
          },
          mutations: {
            // Retry mutations once on network errors
            retry: 1,
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

