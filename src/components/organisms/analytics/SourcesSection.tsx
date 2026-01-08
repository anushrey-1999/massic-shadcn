"use client";

import { Typography } from "@/components/ui/typography";
import { ListChecks, Eye, Star, TrendingUp, TrendingDown, ListOrdered } from "lucide-react";
import React, { useMemo, useState } from "react";
import { DataTable } from "@/components/molecules/analytics/DataTable";
import { DataTableModal } from "@/components/molecules/analytics/DataTableModal";
import { SourcesChannelsChart } from "@/components/molecules/analytics/SourcesChannelsChart";
import {
  useGA4Analytics,
  type TimePeriodValue,
  type TableFilterType,
  type GA4SortColumn,
} from "@/hooks/use-ga4-analytics";
import { useBusinessStore } from "@/store/business-store";
import { usePathname } from "next/navigation";

interface SourcesSectionProps {
  period?: TimePeriodValue;
}

const SourcesSection = ({ period = "3 months" }: SourcesSectionProps) => {
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
    topSourcesData,
    normalizedChannelsData,
    topSourcesFilter,
    topSourcesSort,
    handleTopSourcesFilterChange,
    handleTopSourcesSort,
    isLoading,
    hasTopSourcesData,
    hasChannelsData,
  } = useGA4Analytics(businessUniqueId, website, period);

  const [topSourcesModalOpen, setTopSourcesModalOpen] = useState(false);

  return (
    <div className="flex flex-col px-7 pb-10">
      <div className="flex items-center gap-2 py-5 border-b border-general-muted-foreground">
        <ListChecks className="h-8 w-8 text-general-foreground" />
        <Typography variant="h2">Sources</Typography>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-10">
        <DataTable
          icon={<Eye className="h-6 w-6" />}
          title="Sources that drive the most conversion"
          showTabs
          tabs={[
            { icon: <ListOrdered className="h-4 w-4" />, value: "popular" },
            { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
            { icon: <TrendingDown className="h-4 w-4" />, value: "decaying" },
          ]}
          activeTab={topSourcesFilter}
          onTabChange={(value) => handleTopSourcesFilterChange(value as TableFilterType)}
          columns={[
            { key: "key", label: "Top Sources", width: "w-[240px]" },
            { key: "sessions", label: "Sessions", sortable: true },
            { key: "goals", label: "Goals", sortable: true },
          ]}
          data={topSourcesData.map((item) => ({
            key: item.key,
            sessions: item.sessions,
            goals: item.goals,
          }))}
          isLoading={isLoading}
          hasData={hasTopSourcesData}
          sortConfig={{ column: topSourcesSort.column, direction: topSourcesSort.direction }}
          onSort={(column) => handleTopSourcesSort(column as GA4SortColumn)}
          onArrowClick={() => setTopSourcesModalOpen(true)}
          maxRows={5}
        />

        <SourcesChannelsChart
          data={normalizedChannelsData}
          isLoading={isLoading}
          hasData={hasChannelsData}
        />
      </div>

      {/* Modal */}
      <DataTableModal
        open={topSourcesModalOpen}
        onOpenChange={setTopSourcesModalOpen}
        title="Sources that drive the most conversion"
        icon={<Eye className="h-4 w-4" />}
        tabs={[
          { icon: <ListOrdered className="h-4 w-4" />, value: "popular", label: "Popular" },
          { icon: <TrendingUp className="h-4 w-4" />, value: "growing", label: "Growing" },
          { icon: <TrendingDown className="h-4 w-4" />, value: "decaying", label: "Decaying" },
        ]}
        activeTab={topSourcesFilter}
        onTabChange={(value) => handleTopSourcesFilterChange(value as TableFilterType)}
        columns={[
          { key: "key", label: "Top Sources" },
          { key: "sessions", label: "Sessions", sortable: true },
          { key: "goals", label: "Goals", sortable: true },
        ]}
        data={topSourcesData.map((item) => ({
          key: item.key,
          sessions: item.sessions,
          goals: item.goals,
        }))}
        sortConfig={{ column: topSourcesSort.column, direction: topSourcesSort.direction }}
        onSort={(column) => handleTopSourcesSort(column as GA4SortColumn)}
        isLoading={isLoading}
      />
    </div>
  );
};

export default SourcesSection;