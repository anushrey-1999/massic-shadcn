import { useQuery } from "@tanstack/react-query"
import { api } from "@/hooks/use-api"
import { useAuthStore } from "@/store/auth-store"

export interface BusinessPreviewItem {
  businessUniqueId?: string | null
  url: string
  mainstats?: string
  graph?: string
  // Flags returned by /fetch-business-previews
  isGscConnected?: boolean
  isGa4Connected?: boolean
  isGbpConnected?: boolean
}

const BUSINESS_PREVIEWS_KEY = "businessPreviews"

function normalizePreviewResponse(response: any): BusinessPreviewItem[] {
  if (!response) return []

  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response.data)) {
    return response.data
  }

  if (Array.isArray(response.data?.data)) {
    return response.data.data
  }

  if (Array.isArray(response?.data?.Data)) {
    return response.data.Data
  }

  return []
}

export function useBusinessPreviews(period: string = "3 months") {
  const { user, isAuthenticated } = useAuthStore()
  const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id

  const {
    data: previews = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<BusinessPreviewItem[]>({
    queryKey: [BUSINESS_PREVIEWS_KEY, userUniqueId, period],
    queryFn: async () => {
      if (!userUniqueId) return []

      const payload = {
        origin: "ui",
        useruniqueId: userUniqueId,
        mode: "organic",
        period,
        dimensions: [{ name: "date" }],
      }

      const response = await api.post<any>("/fetch-business-previews", "node", payload)
      return normalizePreviewResponse(response)
    },
    enabled: isAuthenticated && !!userUniqueId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const errorMessage =
    (error as any)?.response?.data?.message ||
    (error as any)?.message ||
    null

  return {
    previews,
    isLoading,
    isFetching,
    error: errorMessage,
    refetchBusinessPreviews: refetch,
  }
}
