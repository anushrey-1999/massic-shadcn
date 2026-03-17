"use client";

import { useState, useMemo, Suspense, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Eye, MousePointerClick, Target } from "lucide-react";
import { useBusinessStore } from "@/store/business-store";
import { PageHeader } from "@/components/molecules/PageHeader";
import { type TimePeriodValue } from "@/hooks/use-gsc-chart-data";
import { type TimePeriodValue as AnalyticsTimePeriodValue } from "@/hooks/use-gsc-analytics";
import { OrganicChartSection } from "@/components/organisms/organic-deepdive/OrganicChartSection";
import { ContentGroupsSection } from "@/components/organisms/organic-deepdive/ContentGroupsSection";
import { TopPagesSection } from "@/components/organisms/organic-deepdive/TopPagesSection";
import { TopQueriesSection } from "@/components/organisms/organic-deepdive/TopQueriesSection";
import { PositionDistributionSection } from "@/components/organisms/organic-deepdive/PositionDistributionSection";
import { OrganicDeepdiveHeader } from "@/components/organisms/organic-deepdive/OrganicDeepdiveHeader";
import { AnalyticsPageTabs, PeriodSelector } from "@/components/molecules/analytics";
import {
  ChartSectionSkeleton,
  TableSectionSkeleton,
  PositionDistributionSkeleton,
} from "@/components/organisms/organic-deepdive/skeletons";
import {
  useOrganicDeepdiveFilters,
} from "@/hooks/use-organic-deepdive-filters";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CHART_LINE_KEYS = ["impressions", "clicks", "goals"] as const;

export function OrganicDeepdiveTemplate() {
  const pathname = usePathname();
  const profiles = useBusinessStore((state) => state.profiles);
  const [period, setPeriod] = useState<TimePeriodValue>("3 months");
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    impressions: true,
    clicks: true,
    goals: true,
  });
  const { filters, filtersForApi, addFilter, removeFilter } = useOrganicDeepdiveFilters();

  const handlePeriodChange = (value: AnalyticsTimePeriodValue) => {
    setPeriod(value as TimePeriodValue);
  };

  const handleChartLineToggle = useCallback((key: string, checked: boolean) => {
    setVisibleLines((prev) => {
      const checkedCount = Object.values(prev).filter(Boolean).length;
      if (!checked && checkedCount <= 1) return prev;
      return { ...prev, [key]: checked };
    });
  }, []);

  const handleQueryClick = (query: string) => {
    addFilter({ dimension: "query", expression: query, operator: "equals" });
  };

  const handlePageClick = (page: string) => {
    addFilter({ dimension: "page", expression: page, operator: "equals" });
  };

  const handleContentGroupClick = (group: string, source?: "custom" | "default") => {
    addFilter({
      dimension: "content_group",
      expression: group,
      operator: "equals",
      source: source === "custom" ? "custom" : "default",
    });
  };

  const { businessUniqueId, website, businessName } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/);
    if (!match)
      return { businessUniqueId: null, website: null, businessName: "" };

    const id = match[1];
    const profile = profiles.find((p) => p.UniqueId === id);
    return {
      businessUniqueId: id,
      website: profile?.Website || null,
      businessName: profile?.Name || profile?.DisplayName || "Business",
    };
  }, [pathname, profiles]);

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      {
        label: "Analytics",
        href: businessUniqueId ? `/business/${businessUniqueId}/analytics` : undefined,
      },
      { label: "Organic Deep Dive" },
    ],
    [businessName, businessUniqueId]
  );

  return (
    <div className="flex flex-col min-h-screen bg-foreground-light">
      <div className="sticky top-0 z-11 bg-foreground-light border-b border-general-border">
        <PageHeader breadcrumbs={breadcrumbs} />

        <div className="w-full max-w-[1224px] px-7 flex items-center justify-between gap-4 py-4">
          <AnalyticsPageTabs businessId={businessUniqueId} />
          <div className="flex items-center gap-2">
            {CHART_LINE_KEYS.map((key) => (
              <Button
                key={key}
                variant="outline"
                size="icon"
                className={cn(
                  "h-8 w-8 shrink-0",
                  visibleLines[key] ? "bg-white" : "bg-transparent"
                )}
                onClick={() =>
                  handleChartLineToggle(key, !visibleLines[key])
                }
                title={
                  key === "impressions"
                    ? "Impressions"
                    : key === "clicks"
                      ? "Clicks"
                      : "Goals"
                }
                aria-pressed={visibleLines[key]}
              >
                {key === "impressions" ? (
                  <Eye className="h-4 w-4 text-gray-500" />
                ) : key === "clicks" ? (
                  <MousePointerClick className="h-4 w-4 text-blue-600 rotate-90" />
                ) : (
                  <Target className="h-4 w-4 text-emerald-600" />
                )}
              </Button>
            ))}
            <PeriodSelector value={period} onValueChange={handlePeriodChange} />
          </div>
        </div>

        {filters.length > 0 ? (
          <div className="w-full max-w-[1224px] px-7">
            <OrganicDeepdiveHeader
              filters={filters}
              onRemoveFilter={removeFilter}
            />
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[1224px] px-7 py-6 flex flex-col gap-3">
          <Suspense fallback={<ChartSectionSkeleton />}>
            <OrganicChartSection
              businessUniqueId={businessUniqueId}
              website={website}
              period={period}
              filters={filtersForApi}
              visibleLines={visibleLines}
              onLegendToggle={handleChartLineToggle}
            />
          </Suspense>

          <div className="grid grid-cols-2 gap-3">
            <Suspense fallback={<TableSectionSkeleton />}>
              <ContentGroupsSection
                businessUniqueId={businessUniqueId}
                website={website}
                period={period}
                filters={filtersForApi}
                onRowClick={handleContentGroupClick}
              />
            </Suspense>

            <Suspense fallback={<TableSectionSkeleton />}>
              <TopPagesSection
                businessUniqueId={businessUniqueId}
                website={website}
                period={period}
                filters={filtersForApi}
                onRowClick={handlePageClick}
              />
            </Suspense>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Suspense fallback={<TableSectionSkeleton />}>
              <TopQueriesSection
                businessUniqueId={businessUniqueId}
                website={website}
                period={period}
                filters={filtersForApi}
                onRowClick={handleQueryClick}
              />
            </Suspense>

            <Suspense fallback={<PositionDistributionSkeleton />}>
              <PositionDistributionSection
                businessUniqueId={businessUniqueId}
                website={website}
                period={period}
                filters={filtersForApi}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
