import { useGSCAnalytics, type TimePeriodValue } from "@/hooks/use-gsc-analytics"

export function useOverviewFunnelData(
  businessUniqueId: string | null,
  website: string | null,
  period: TimePeriodValue = "3 months"
) {
  const { funnelChartItems, hasFunnelData, loadingState } = useGSCAnalytics(
    businessUniqueId,
    website,
    period
  )

  return {
    funnelChartItems,
    hasFunnelData,
    isLoading: loadingState.funnel,
  }
}
