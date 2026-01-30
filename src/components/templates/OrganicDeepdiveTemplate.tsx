"use client";

import { useState, useMemo, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useBusinessStore } from "@/store/business-store";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Button } from "@/components/ui/button";
import { type TimePeriodValue } from "@/hooks/use-gsc-chart-data";
import { type TimePeriodValue as AnalyticsTimePeriodValue } from "@/hooks/use-gsc-analytics";
import { OrganicChartSection } from "@/components/organisms/organic-deepdive/OrganicChartSection";
import { ContentGroupsSection } from "@/components/organisms/organic-deepdive/ContentGroupsSection";
import { TopPagesSection } from "@/components/organisms/organic-deepdive/TopPagesSection";
import { TopQueriesSection } from "@/components/organisms/organic-deepdive/TopQueriesSection";
import { PositionDistributionSection } from "@/components/organisms/organic-deepdive/PositionDistributionSection";
import { OrganicDeepdiveHeader } from "@/components/organisms/organic-deepdive/OrganicDeepdiveHeader";
import {
  ChartSectionSkeleton,
  TableSectionSkeleton,
  PositionDistributionSkeleton,
} from "@/components/organisms/organic-deepdive/skeletons";
import {
  useOrganicDeepdiveFilters,
  type DeepdiveFilter,
} from "@/hooks/use-organic-deepdive-filters";

export function OrganicDeepdiveTemplate() {
  const router = useRouter();
  const pathname = usePathname();
  const profiles = useBusinessStore((state) => state.profiles);
  const [period, setPeriod] = useState<TimePeriodValue>("3 months");
  const { filters, filtersForApi, addFilter, removeFilter } = useOrganicDeepdiveFilters();

  const handlePeriodChange = (value: AnalyticsTimePeriodValue) => {
    setPeriod(value as TimePeriodValue);
  };

  const handleQueryClick = (query: string) => {
    addFilter({ dimension: "query", expression: query, operator: "equals" });
  };

  const handlePageClick = (page: string) => {
    addFilter({ dimension: "page", expression: page, operator: "equals" });
  };

  const handleContentGroupClick = (group: string) => {
    addFilter({ dimension: "content_group", expression: group, operator: "equals" });
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

        {/* <div className="flex items-center justify-between py-4 px-7 bg-foreground-light border-b border-general-border">
          <div className="flex items-center gap-3">
            
          </div>
        </div> */}

        <div className="w-full max-w-[1224px] px-7">
          <OrganicDeepdiveHeader
            period={period}
            onPeriodChange={handlePeriodChange}
            filters={filters}
            onRemoveFilter={removeFilter}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[1224px] px-7 py-6 flex flex-col gap-3">
          <Suspense fallback={<ChartSectionSkeleton />}>
            <OrganicChartSection
              businessUniqueId={businessUniqueId}
              website={website}
              period={period}
              filters={filtersForApi}
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
