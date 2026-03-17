"use client";

import { Typography } from "@/components/ui/typography";
import {
  ChartNoAxesCombined,
  Eye,
  TrendingUp,
  TrendingDown,
  ListOrdered,
} from "lucide-react";
import { DataTable } from "@/components/molecules/analytics/DataTable";
import { DataTableModal } from "@/components/molecules/analytics/DataTableModal";
// import { ClicksGoalsChartCard } from "@/components/molecules/analytics/ClicksGoalsChartCard";
import {
  useGA4Analytics,
  type TimePeriodValue,
  type TableFilterType,
  type GA4SortColumn,
  type GA4TrafficScope,
} from "@/hooks/use-ga4-analytics";
import { useBusinessStore } from "@/store/business-store";
import { usePathname } from "next/navigation";
import { useMemo, useState, useCallback } from "react";

interface ConversionSectionProps {
  period?: TimePeriodValue;
  ga4TrafficScope?: GA4TrafficScope;
}

const ConversionSection = ({ period = "3 months", ga4TrafficScope = "all" }: ConversionSectionProps) => {
  const pathname = usePathname();
  const profiles = useBusinessStore((state) => state.profiles);

  const { businessUniqueId, website } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/);
    if (!match) return { businessUniqueId: null, website: null };

    const id = match[1];
    const profile = profiles.find((p) => p.UniqueId === id);
    return {
      businessUniqueId: id,
      website: profile?.Website || null,
    };
  }, [pathname, profiles]);

  const {
    goalsData,
    goalsFilter,
    goalsSort,
    handleGoalsFilterChange,
    handleGoalsSort,
    loadingState,
    hasGoalsData,
  } = useGA4Analytics(businessUniqueId, website, period, ga4TrafficScope);

  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const showGoalsLoader = loadingState.goals && !hasGoalsData;

  return (
    <div className="px-7 pb-10">
      <div className="flex items-center gap-2 pb-6">
        <ChartNoAxesCombined className="h-8 w-8 text-general-foreground" />
        <Typography variant="h2">Conversions</Typography>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid gap-3 grid-cols-1">
          <DataTable
            icon={<Eye className="h-6 w-6" />}
            title="Tracked CTAs"
            titleTooltip="Your tracked CTAs"
            inlineHeader
            showTabs
            tabs={[
              { icon: <ListOrdered className="h-4 w-4" />, value: "popular" },
              { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
              { icon: <TrendingDown className="h-4 w-4" />, value: "decaying" },
            ]}
            activeTab={goalsFilter}
            onTabChange={(value) =>
              handleGoalsFilterChange(value as TableFilterType)
            }
            columns={[
              { key: "goal", label: "Goal", width: "flex-1" },
              {
                key: "goals",
                label: "Goals",
                sortable: true,
                width: "w-[156px]",
              },
            ]}
            data={goalsData.map((item) => ({
              goal: item.goal,
              goals: item.goals,
            }))}
            isLoading={showGoalsLoader}
            hasData={hasGoalsData}
            sortConfig={{
              column: goalsSort.column,
              direction: goalsSort.direction,
            }}
            onSort={(column) => handleGoalsSort(column as GA4SortColumn)}
            onArrowClick={() => setGoalsModalOpen(true)}
            maxRows={10}
          />

          {/*
            <ClicksGoalsChartCard
              clicksMetric={{
                value: sessionsMetric.value,
                change: sessionsMetric.change,
                icon: "clicks",
              }}
              goalsMetric={{
                value: goalsMetric.value,
                change: goalsMetric.change,
                icon: "goals",
              }}
              data={normalizedChartData}
              isLoading={showChartLoader}
              hasData={hasChartData}
              visibleLines={visibleLines}
              onLegendToggle={handleLegendToggle}
            />
          */}
        </div>
      </div>

      {/* Modals */}
      <DataTableModal
        open={goalsModalOpen}
        onOpenChange={setGoalsModalOpen}
        title="Your tracked CTAs"
        icon={<Eye className="h-4 w-4" />}
        tabs={[
          {
            icon: <ListOrdered className="h-4 w-4" />,
            value: "popular",
            label: "Popular",
          },
          {
            icon: <TrendingUp className="h-4 w-4" />,
            value: "growing",
            label: "Growing",
          },
          {
            icon: <TrendingDown className="h-4 w-4" />,
            value: "decaying",
            label: "Decaying",
          },
        ]}
        activeTab={goalsFilter}
        onTabChange={(value) =>
          handleGoalsFilterChange(value as TableFilterType)
        }
        columns={[
          { key: "goal", label: "Goal" },
          { key: "goals", label: "Goals", sortable: true },
        ]}
        data={goalsData.map((item) => ({
          goal: item.goal,
          goals: item.goals,
        }))}
        sortConfig={{
          column: goalsSort.column,
          direction: goalsSort.direction,
        }}
        onSort={(column) => handleGoalsSort(column as GA4SortColumn)}
        isLoading={showGoalsLoader}
      />
    </div>
  );
};

export default ConversionSection;
