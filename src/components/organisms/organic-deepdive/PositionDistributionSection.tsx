"use client";

import { useGscPositionDistribution, type TimePeriodValue } from "@/hooks/use-gsc-position-distribution";
import { PositionDistributionCard } from "@/components/molecules/analytics/PositionDistributionCard";
import { type DeepdiveFilter } from "@/hooks/use-organic-deepdive-filters";

interface PositionDistributionSectionProps {
  businessUniqueId: string | null;
  website: string | null;
  period: TimePeriodValue;
  filters?: DeepdiveFilter[];
}

export function PositionDistributionSection({
  businessUniqueId,
  website,
  period,
  filters = [],
}: PositionDistributionSectionProps) {
  const { positionChartData, positionMetrics, visibleLines, handleLegendToggle, isLoading, hasData } = useGscPositionDistribution(
    businessUniqueId,
    website,
    period,
    filters
  );

  return (
    <PositionDistributionCard
      title="How you rank"
      positions={positionMetrics}
      chartData={positionChartData}
      visibleLines={visibleLines}
      onToggle={handleLegendToggle}
      isLoading={isLoading}
      hasData={hasData}
    />
  );
}
