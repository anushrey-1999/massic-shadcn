"use client";

import { Typography } from "@/components/ui/typography";
import {
  ChartNoAxesCombined,
  Eye,
  Star,
  TrendingUp,
  TrendingDown,
  ListOrdered,
} from "lucide-react";
import { DataTable } from "@/components/molecules/analytics/DataTable";
import { DataTableModal } from "@/components/molecules/analytics/DataTableModal";
import { ClicksGoalsChartCard } from "@/components/molecules/analytics/ClicksGoalsChartCard";
import {
  useGA4Analytics,
  type TimePeriodValue,
  type TableFilterType,
  type GA4SortColumn,
} from "@/hooks/use-ga4-analytics";
import { useBusinessStore } from "@/store/business-store";
import { usePathname } from "next/navigation";
import { useMemo, useState, useCallback } from "react";

interface ConversionSectionProps {
  period?: TimePeriodValue;
}

const ConversionSection = ({ period = "3 months" }: ConversionSectionProps) => {
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
    normalizedChartData,
    sessionsMetric,
    goalsMetric,
    goalsData,
    contentGroupsData,
    topPagesData,
    goalsFilter,
    contentGroupsFilter,
    topPagesFilter,
    goalsSort,
    contentGroupsSort,
    topPagesSort,
    handleGoalsFilterChange,
    handleContentGroupsFilterChange,
    handleTopPagesFilterChange,
    handleGoalsSort,
    handleContentGroupsSort,
    handleTopPagesSort,
    isLoading,
    hasChartData,
    hasGoalsData,
    hasContentGroupsData,
    hasTopPagesData,
  } = useGA4Analytics(businessUniqueId, website, period);

  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    sessions: true,
    goals: true,
  });

  const handleLegendToggle = useCallback((key: string, checked: boolean) => {
    setVisibleLines((prev) => {
      const checkedCount = Object.values(prev).filter(Boolean).length;
      if (!checked && checkedCount <= 1) {
        return prev;
      }
      return { ...prev, [key]: checked };
    });
  }, []);

  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [contentGroupsModalOpen, setContentGroupsModalOpen] = useState(false);
  const [topPagesModalOpen, setTopPagesModalOpen] = useState(false);

  return (
    <div className="px-7 pb-10">
      <div className="flex items-center gap-2 px-6 py-5 bg-[#0A0A0A0D] rounded-lg">
        <ChartNoAxesCombined className="h-8 w-8 text-general-foreground" />
        <Typography variant="h2">Conversions</Typography>
      </div>

      <div className="flex flex-col gap-6 pt-6">
        <div className="grid grid-cols-2 gap-6 ">
          <DataTable
            icon={<Eye className="h-6 w-6" />}
            title="Your tracked CTAs"
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
            isLoading={isLoading}
            hasData={hasGoalsData}
            sortConfig={{
              column: goalsSort.column,
              direction: goalsSort.direction,
            }}
            onSort={(column) => handleGoalsSort(column as GA4SortColumn)}
            onArrowClick={() => setGoalsModalOpen(true)}
            maxRows={5}
          />

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
            isLoading={isLoading}
            hasData={hasChartData}
            visibleLines={visibleLines}
            onLegendToggle={handleLegendToggle}
          />
        </div>

        <div className="grid grid-cols-2 gap-6  ">
          <DataTable
            icon={<Eye className="h-6 w-6" />}
            title="Where conversions happen"
            showTabs
            tabs={[
              { icon: <ListOrdered className="h-4 w-4" />, value: "popular" },
              { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
              { icon: <TrendingDown className="h-4 w-4" />, value: "decaying" },
            ]}
            activeTab={contentGroupsFilter}
            onTabChange={(value) =>
              handleContentGroupsFilterChange(value as TableFilterType)
            }
            columns={[
              { key: "key", label: "Page Groups", width: "w-[240px]" },
              { key: "sessions", label: "Sessions", sortable: true },
              { key: "goals", label: "Goals", sortable: true },
            ]}
            data={contentGroupsData.map((item) => ({
              key: item.key,
              sessions: item.sessions,
              goals: item.goals,
            }))}
            isLoading={isLoading}
            hasData={hasContentGroupsData}
            sortConfig={{
              column: contentGroupsSort.column,
              direction: contentGroupsSort.direction,
            }}
            onSort={(column) =>
              handleContentGroupsSort(column as GA4SortColumn)
            }
            onArrowClick={() => setContentGroupsModalOpen(true)}
            maxRows={5}
          />

          <DataTable
            icon={<Eye className="h-6 w-6" />}
            title="Where conversions happen"
            showTabs
            tabs={[
              { icon: <ListOrdered className="h-4 w-4" />, value: "popular" },
              { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
              { icon: <TrendingDown className="h-4 w-4" />, value: "decaying" },
            ]}
            activeTab={topPagesFilter}
            onTabChange={(value) =>
              handleTopPagesFilterChange(value as TableFilterType)
            }
            columns={[
              { key: "key", label: "Top Pages", width: "w-[240px]" },
              { key: "sessions", label: "Sessions", sortable: true },
              { key: "goals", label: "Goals", sortable: true },
            ]}
            data={topPagesData.map((item) => ({
              key: item.key,
              sessions: item.sessions,
              goals: item.goals,
            }))}
            isLoading={isLoading}
            hasData={hasTopPagesData}
            sortConfig={{
              column: topPagesSort.column,
              direction: topPagesSort.direction,
            }}
            onSort={(column) => handleTopPagesSort(column as GA4SortColumn)}
            onArrowClick={() => setTopPagesModalOpen(true)}
            maxRows={5}
          />
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
        isLoading={isLoading}
      />

      <DataTableModal
        open={contentGroupsModalOpen}
        onOpenChange={setContentGroupsModalOpen}
        title="Where conversions happen"
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
        activeTab={contentGroupsFilter}
        onTabChange={(value) =>
          handleContentGroupsFilterChange(value as TableFilterType)
        }
        columns={[
          { key: "key", label: "Page Groups" },
          { key: "sessions", label: "Sessions", sortable: true },
          { key: "goals", label: "Goals", sortable: true },
        ]}
        data={contentGroupsData.map((item) => ({
          key: item.key,
          sessions: item.sessions,
          goals: item.goals,
        }))}
        sortConfig={{
          column: contentGroupsSort.column,
          direction: contentGroupsSort.direction,
        }}
        onSort={(column) => handleContentGroupsSort(column as GA4SortColumn)}
        isLoading={isLoading}
      />

      <DataTableModal
        open={topPagesModalOpen}
        onOpenChange={setTopPagesModalOpen}
        title="Top converting pages"
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
        activeTab={topPagesFilter}
        onTabChange={(value) =>
          handleTopPagesFilterChange(value as TableFilterType)
        }
        columns={[
          { key: "key", label: "Top Pages" },
          { key: "sessions", label: "Sessions", sortable: true },
          { key: "goals", label: "Goals", sortable: true },
        ]}
        data={topPagesData.map((item) => ({
          key: item.key,
          sessions: item.sessions,
          goals: item.goals,
        }))}
        sortConfig={{
          column: topPagesSort.column,
          direction: topPagesSort.direction,
        }}
        onSort={(column) => handleTopPagesSort(column as GA4SortColumn)}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ConversionSection;
