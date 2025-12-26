"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { MapPin, Search, Loader2, ChartNoAxesCombined } from "lucide-react";
import { DataTable, type SortConfig } from "@/components/molecules/analytics/DataTable";
import { DataTableModal } from "@/components/molecules/analytics/DataTableModal";
import { InteractionsChartCard } from "@/components/molecules/analytics/InteractionsChartCard";
import {
  useLocalPresence,
  type TimePeriodValue,
} from "@/hooks/use-local-presence";
import { useBusinessStore } from "@/store/business-store";

interface LocationOption {
  value: string;
  label: string;
}

interface LocalSearchSectionProps {
  period?: TimePeriodValue;
  locations?: LocationOption[];
  selectedLocation?: string;
}

export function LocalSearchSection({
  period = "3 months",
  locations = [],
  selectedLocation = "",
}: LocalSearchSectionProps) {
  const pathname = usePathname();
  const profiles = useBusinessStore((state) => state.profiles);
  const [queriesModalOpen, setQueriesModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: "searches",
    direction: "desc",
  });

  const { businessUniqueId } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/);
    if (!match) return { businessUniqueId: null };

    const id = match[1];
    return { businessUniqueId: id };
  }, [pathname]);

  const {
    interactionsChartData,
    interactionsMetric,
    queriesData,
    isLoading,
    hasInteractionsData,
    hasQueriesData,
  } = useLocalPresence(businessUniqueId, period, selectedLocation);

  const tableData = useMemo(() => {
    const mapped = queriesData.map((item) => ({
      query: item.queries,
      searches: { value: item.searches.value },
    }));

    if (sortConfig.column === "searches") {
      return [...mapped].sort((a, b) => {
        const aVal = a.searches.value;
        const bVal = b.searches.value;
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return mapped;
  }, [queriesData, sortConfig]);

  const handleSort = (column: string) => {
    setSortConfig((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  if (locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] border rounded-lg bg-muted/20">
        <p className="text-sm text-muted-foreground">
          No locations configured for this business
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px] border rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <InteractionsChartCard
            icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
            title="Local interactions with your listing"
            legend={{
              color: "#3b82f6",
              label: interactionsMetric.label,
              value: interactionsMetric.value,
              change: interactionsMetric.change,
            }}
            data={hasInteractionsData ? interactionsChartData : []}
            dataKey="interactions"
          />
        )}

        <DataTable
          title="Local searches to discover you"
          columns={[
            { key: "query", label: "Query", width: "w-[250px]" },
            { key: "searches", label: "Searches", sortable: true },
          ]}
          data={tableData}
          isLoading={isLoading}
          hasData={hasQueriesData}
          maxRows={5}
          sortConfig={sortConfig}
          onSort={handleSort}
          onArrowClick={() => setQueriesModalOpen(true)}
        />
      </div>

      <DataTableModal
        open={queriesModalOpen}
        onOpenChange={setQueriesModalOpen}
        title="Top Queries"
        icon={<Search className="h-4 w-4" />}
        columns={[
          { key: "query", label: "Query" },
          { key: "searches", label: "Searches", sortable: true },
        ]}
        data={tableData}
        isLoading={isLoading}
        sortConfig={sortConfig}
        onSort={handleSort}
      />
    </>
  );
}
