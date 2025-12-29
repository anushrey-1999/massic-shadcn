import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { AxiosError } from "axios"
import { api } from "@/hooks/use-api"
import type { TimePeriodValue } from "@/hooks/use-gsc-analytics"

interface MetricCompare {
  Percentage?: string
  Diff?: string
  Trend?: "up" | "down" | "neutral" | string
}

interface BrandedNonBrandedApiResponse {
  err?: boolean
  code?:
  | "INVALID_REQUEST"
  | "INVALID_PERIOD"
  | "BUSINESS_PROFILE_NOT_FOUND"
  | "BRAND_TERMS_MISSING"
  | "GSC_NOT_CONNECTED"
  | string
  message?: string
  branded?: MetricCompare
  nonBranded?: MetricCompare
}

export type BrandedNonBrandedStatus =
  | "idle"
  | "loading"
  | "success"
  | "brand-terms-missing"
  | "gsc-not-connected"
  | "error"

function parseSignedChange(metric: MetricCompare | undefined): number {
  const diffRaw = metric?.Diff || "0%"
  const numeric = parseFloat(String(diffRaw).replace("%", ""))
  const abs = Number.isFinite(numeric) ? Math.round(numeric) : 0
  const trend = String(metric?.Trend || "").toLowerCase()
  if (trend === "down") return -abs
  return abs
}

async function fetchBrandedNonBranded(
  businessId: string,
  website: string,
  period: TimePeriodValue
): Promise<BrandedNonBrandedApiResponse> {
  try {
    return await api.post<BrandedNonBrandedApiResponse>(
      "/fetch-branded-nonbranded",
      "node",
      {
        uniqueId: businessId,
        website,
        Period: period,
        origin: "ui",
      }
    )
  } catch (error) {
    const axiosError = error as AxiosError<any>
    // Keep the hook resilient: return a shaped error response for 4xx.
    if (axiosError.response?.data) {
      return axiosError.response.data as BrandedNonBrandedApiResponse
    }
    throw error
  }
}

export function useBrandedNonBranded(
  businessId: string | null,
  website: string | null,
  period: TimePeriodValue
) {
  const {
    data: apiData,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["branded-nonbranded", businessId, website, period],
    queryFn: () => fetchBrandedNonBranded(businessId!, website!, period),
    enabled: !!businessId && !!website,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const status = useMemo<BrandedNonBrandedStatus>(() => {
    if (!businessId || !website) return "idle"
    if (isLoading || isFetching) return "loading"
    if (apiData?.code === "BRAND_TERMS_MISSING") return "brand-terms-missing"
    if (apiData?.code === "GSC_NOT_CONNECTED") return "gsc-not-connected"
    if (apiData?.err) return "error"

    if (!apiData?.branded?.Percentage && !apiData?.nonBranded?.Percentage) return "error"

    return "success"
  }, [apiData, businessId, website, isLoading, isFetching])

  const statusMessage = useMemo(() => {
    switch (status) {
      case "idle":
        return "Select a business to view branded metrics"
      case "loading":
        return "Analyzing branded vs non-branded queries..."
      case "brand-terms-missing":
        return "Brand terms should be added in profile"
      case "gsc-not-connected":
        return "Google Search Console is not connected"
      case "error":
        return apiData?.message || "Unable to load branded metrics"
      case "success":
        return ""
      default:
        return ""
    }
  }, [status, apiData])

  const brandedCard = useMemo(() => {
    return {
      key: "branded",
      title: "Branded",
      percentage: apiData?.branded?.Percentage || "0%",
      value: 0,
      change: parseSignedChange(apiData?.branded),
      sparklineData: [],
    }
  }, [apiData])

  const nonBrandedCard = useMemo(() => {
    return {
      key: "non-branded",
      title: "Non-branded",
      percentage: apiData?.nonBranded?.Percentage || "0%",
      value: 0,
      change: parseSignedChange(apiData?.nonBranded),
      sparklineData: [],
    }
  }, [apiData])

  return {
    apiData,
    status,
    statusMessage,
    isLoading: isLoading || isFetching,
    isError,
    error,
    brandedCard,
    nonBrandedCard,
  }
}
