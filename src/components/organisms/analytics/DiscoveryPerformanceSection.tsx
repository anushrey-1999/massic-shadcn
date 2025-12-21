"use client";

import { Typography } from "@/components/ui/typography";
import { TimePeriodValue } from "@/hooks/use-gsc-analytics";
import { Search, Eye, Star, TrendingUp, TrendingDown } from "lucide-react";
import Image from "next/image";
import React, { useMemo, useState } from "react";
import { DataTable } from "@/components/molecules/analytics/DataTable";
import { DataTableModal } from "@/components/molecules/analytics/DataTableModal";
import { PositionDistributionCard } from "@/components/molecules/analytics/PositionDistributionCard";
import { AITrafficChartCard } from "@/components/molecules/analytics/AITrafficChartCard";
import { LLMComparisonChart } from "@/components/molecules/analytics/LLMComparisonChart";
import {
  useGSCAnalytics,
  type TableFilterType,
} from "@/hooks/use-gsc-analytics";
import { useTotalQueries } from "@/hooks/use-total-queries";
import { useAISearchAnalytics } from "@/hooks/use-ai-search-analytics";
import { useBusinessStore } from "@/store/business-store";
import { usePathname } from "next/navigation";

interface DiscoveryPerformanceSectionProps {
  period?: TimePeriodValue;
}

const DiscoveryPerformanceSection = ({
  period = "3 months",
}: DiscoveryPerformanceSectionProps) => {
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
    isLoading,
    contentGroupsData,
    topPagesData,
    topQueriesData,
    contentGroupsFilter,
    topPagesFilter,
    topQueriesFilter,
    contentGroupsSort,
    topPagesSort,
    topQueriesSort,
    handleContentGroupsFilterChange,
    handleTopPagesFilterChange,
    handleTopQueriesFilterChange,
    handleContentGroupsSort,
    handleTopPagesSort,
    handleTopQueriesSort,
    hasContentGroupsData,
    hasTopPagesData,
    hasTopQueriesData,
  } = useGSCAnalytics(businessUniqueId, website, period);

  const {
    positionLegendItems,
    normalizedChartData: positionChartData,
    visibleLines: positionVisibleLines,
    isLoading: isLoadingPositions,
    hasData: hasPositionData,
    handleLegendToggle: handlePositionLegendToggle,
  } = useTotalQueries(businessUniqueId, website, period);

  const {
    chartData,
    normalizedSourcesData,
    metricsForCard,
    isLoading: isLoadingAI,
    hasChartData,
    hasSourcesData,
  } = useAISearchAnalytics(businessUniqueId, website, period);

  const llmIcons: Record<string, React.ReactNode> = {
    chatgpt: (
      <Image
        src="/icons/llms/chatgpt.svg"
        alt="ChatGPT"
        width={38}
        height={38}
        className="h-[38px] w-[38px]"
        unoptimized
      />
    ),
    claude: (
      <Image
        src="/icons/llms/calude.svg"
        alt="Claude"
        width={38}
        height={38}
        className="h-[38px] w-[38px]"
        unoptimized
      />
    ),
    perplexity: (
      <Image
        src="/icons/llms/perplexity.svg"
        alt="Perplexity"
        width={38}
        height={38}
        className="h-[38px] w-[38px]"
        unoptimized
      />
    ),
    gemini: (
      <Image
        src="/icons/llms/gemini.svg"
        alt="Gemini"
        width={38}
        height={38}
        className="h-[38px] w-[38px]"
        unoptimized
      />
    ),
    bing: (
      <Image
        src="/icons/llms/bing.svg"
        alt="Bing Chat"
        width={38}
        height={38}
        className="h-[38px] w-[38px]"
        unoptimized
      />
    ),
    "bing.com/chat": (
      <Image
        src="/icons/llms/bing.svg"
        alt="Bing Chat"
        width={38}
        height={38}
        className="h-[38px] w-[38px]"
        unoptimized
      />
    ),
  };

  function getIconForSource(sourceName: string): React.ReactNode {
    const normalizedName = sourceName.toLowerCase().trim();

    // Handle bing variations (Bing, bing.com/chat, etc.)
    if (normalizedName.includes("bing")) {
      return llmIcons.bing;
    }

    // Direct lookup - the hook returns names like "ChatGPT", "Claude", etc.
    // which when lowercased match our icon keys
    if (llmIcons[normalizedName]) {
      return llmIcons[normalizedName];
    }

    // Fallback to default icon if no match found
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 8v4M12 16h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const llmDataWithIcons = useMemo(() => {
    // Define the desired order: ChatGPT, Claude, Perplexity, Gemini, Bing
    const orderMap: Record<string, number> = {
      chatgpt: 1,
      claude: 2,
      perplexity: 3,
      gemini: 4,
      bing: 5,
    };

    // Define custom colors for each LLM
    const colorMap: Record<string, string> = {
      chatgpt: "#0A0A0A",
      claude: "#D97757",
      perplexity: "#22B8CD",
      gemini: "#4E86FC",
      bing: "#03ABCD",
    };

    const getOrder = (name: string): number => {
      const normalized = name.toLowerCase().trim();
      // Handle bing variations
      if (normalized.includes("bing")) {
        return orderMap.bing;
      }
      return orderMap[normalized] || 999;
    };

    const getColor = (name: string, fallbackColor: string): string => {
      const normalized = name.toLowerCase().trim();
      // Handle bing variations
      if (normalized.includes("bing")) {
        return colorMap.bing;
      }
      return colorMap[normalized] || fallbackColor;
    };

    console.log("🔍 Raw normalizedSourcesData:", normalizedSourcesData);

    const mappedData = normalizedSourcesData
      .map((source) => {
        const icon = getIconForSource(source.name);
        const customColor = getColor(source.name, source.color);
        const mapped = {
          name: source.name,
          icon: icon,
          value: source.normalizedValue,
          rawValue: source.value,
          change: source.change,
          color: customColor,
        };
        console.log(
          `📊 Mapping: "${source.name}" -> icon:`,
          icon,
          "color:",
          customColor,
          "data:",
          mapped
        );
        return mapped;
      })
      .sort((a, b) => {
        const aOrder = getOrder(a.name);
        const bOrder = getOrder(b.name);
        console.log(
          `🔄 Sorting: "${a.name}" (order: ${aOrder}) vs "${b.name}" (order: ${bOrder})`
        );
        return aOrder - bOrder;
      });

    console.log("✅ Final llmDataWithIcons:", mappedData);
    return mappedData;
  }, [normalizedSourcesData]);

  const [contentGroupsModalOpen, setContentGroupsModalOpen] = useState(false);
  const [topPagesModalOpen, setTopPagesModalOpen] = useState(false);
  const [topQueriesModalOpen, setTopQueriesModalOpen] = useState(false);

  return (
    <div className="">
      <div className="flex items-center gap-2 mb-6">
        <Search className="h-8 w-8 text-general-foreground" />
        <Typography variant="h2">Discovery</Typography>
      </div>

      <div className="flex flex-col gap-4">
        <div className="border border-general-border rounded-lg p-3 ">
          <div className="grid grid-cols-2 gap-8">
            <DataTable
              title="Content people are seeing"
              showTabs
              tabs={[
                { icon: <Star className="h-4 w-4" />, value: "popular" },
                { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
                {
                  icon: <TrendingDown className="h-4 w-4" />,
                  value: "decaying",
                },
              ]}
              activeTab={contentGroupsFilter}
              onTabChange={(value) =>
                handleContentGroupsFilterChange(value as TableFilterType)
              }
              columns={[
                { key: "key", label: "Content Groups", width: "w-[200px]" },
                { key: "impressions", label: "Impressions", sortable: true },
                { key: "clicks", label: "Clicks", sortable: true },
              ]}
              data={contentGroupsData.map((item) => ({
                key: item.key,
                impressions: item.impressions,
                clicks: item.clicks,
              }))}
              isLoading={isLoading}
              hasData={hasContentGroupsData}
              sortConfig={contentGroupsSort}
              onSort={(column) =>
                handleContentGroupsSort(column as "impressions" | "clicks")
              }
              onArrowClick={() => setContentGroupsModalOpen(true)}
              maxRows={5}
            />

            <DataTable
              icon={<></>}
              title=""
              showTabs
              tabs={[
                { icon: <Star className="h-4 w-4" />, value: "popular" },
                { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
                {
                  icon: <TrendingDown className="h-4 w-4" />,
                  value: "decaying",
                },
              ]}
              activeTab={topPagesFilter}
              onTabChange={(value) =>
                handleTopPagesFilterChange(value as TableFilterType)
              }
              columns={[
                { key: "key", label: "Top Pages", width: "w-[200px]" },
                { key: "impressions", label: "Impressions", sortable: true },
                { key: "clicks", label: "Clicks", sortable: true },
              ]}
              data={topPagesData.map((item) => ({
                key: item.key,
                impressions: item.impressions,
                clicks: item.clicks,
              }))}
              isLoading={isLoading}
              hasData={hasTopPagesData}
              sortConfig={topPagesSort}
              onSort={(column) =>
                handleTopPagesSort(column as "impressions" | "clicks")
              }
              onArrowClick={() => setTopPagesModalOpen(true)}
              maxRows={5}
            />
          </div>
        </div>

        {/* Second Row */}
        <div className="border border-general-border rounded-lg p-3">
          <div className="grid grid-cols-2 gap-8">
            <DataTable
              icon={<Eye className="h-4 w-4" />}
              title="Searches to discover you"
              showTabs
              tabs={[
                { icon: <Star className="h-4 w-4" />, value: "popular" },
                { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
                {
                  icon: <TrendingDown className="h-4 w-4" />,
                  value: "decaying",
                },
              ]}
              activeTab={topQueriesFilter}
              onTabChange={(value) =>
                handleTopQueriesFilterChange(value as TableFilterType)
              }
              columns={[
                { key: "key", label: "Top Queries", width: "w-[200px]" },
                { key: "impressions", label: "Impressions", sortable: true },
                { key: "clicks", label: "Clicks", sortable: true },
              ]}
              data={topQueriesData.map((item) => ({
                key: item.key,
                impressions: item.impressions,
                clicks: item.clicks,
              }))}
              isLoading={isLoading}
              hasData={hasTopQueriesData}
              sortConfig={topQueriesSort}
              onSort={(column) =>
                handleTopQueriesSort(column as "impressions" | "clicks")
              }
              onArrowClick={() => setTopQueriesModalOpen(true)}
              maxRows={5}
            />
            <PositionDistributionCard
              positions={positionLegendItems}
              chartData={positionChartData}
              visibleLines={positionVisibleLines}
              onToggle={handlePositionLegendToggle}
              isLoading={isLoadingPositions}
              hasData={hasPositionData}
            />
          </div>
        </div>

        {/* AI Search Section */}
        <div className="border border-general-border rounded-lg p-3 flex flex-col gap-2.5">
          <Typography
            variant="p"
            className="font-mono text-general-secondary-foreground"
          >
            AI Search
          </Typography>

          <div className="grid grid-cols-2 gap-9 ">
            <AITrafficChartCard
              title="AI Search Traffic Over Time"
              metrics={metricsForCard}
              data={chartData}
              isLoading={isLoadingAI}
              hasData={hasChartData}
            />

            <LLMComparisonChart
              title="Relative search traffic across major LLMs"
              data={llmDataWithIcons}
              isLoading={isLoadingAI}
              hasData={hasSourcesData}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <DataTableModal
        open={contentGroupsModalOpen}
        onOpenChange={setContentGroupsModalOpen}
        title="Content people are seeing"
        icon={<Eye className="h-4 w-4" />}
        tabs={[
          {
            icon: <Star className="h-4 w-4" />,
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
          { key: "key", label: "Content Groups" },
          { key: "impressions", label: "Impressions", sortable: true },
          { key: "clicks", label: "Clicks", sortable: true },
        ]}
        data={contentGroupsData.map((item) => ({
          key: item.key,
          impressions: item.impressions,
          clicks: item.clicks,
        }))}
        sortConfig={contentGroupsSort}
        onSort={(column) =>
          handleContentGroupsSort(column as "impressions" | "clicks")
        }
        isLoading={isLoading}
      />

      <DataTableModal
        open={topPagesModalOpen}
        onOpenChange={setTopPagesModalOpen}
        title="Top Pages"
        icon={<Eye className="h-4 w-4" />}
        tabs={[
          {
            icon: <Star className="h-4 w-4" />,
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
          { key: "key", label: "Page" },
          { key: "impressions", label: "Impressions", sortable: true },
          { key: "clicks", label: "Clicks", sortable: true },
        ]}
        data={topPagesData.map((item) => ({
          key: item.key,
          impressions: item.impressions,
          clicks: item.clicks,
        }))}
        sortConfig={topPagesSort}
        onSort={(column) =>
          handleTopPagesSort(column as "impressions" | "clicks")
        }
        isLoading={isLoading}
      />

      <DataTableModal
        open={topQueriesModalOpen}
        onOpenChange={setTopQueriesModalOpen}
        title="Searches to discover you"
        icon={<Eye className="h-4 w-4" />}
        tabs={[
          {
            icon: <Star className="h-4 w-4" />,
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
        activeTab={topQueriesFilter}
        onTabChange={(value) =>
          handleTopQueriesFilterChange(value as TableFilterType)
        }
        columns={[
          { key: "key", label: "Query" },
          { key: "impressions", label: "Impressions", sortable: true },
          { key: "clicks", label: "Clicks", sortable: true },
        ]}
        data={topQueriesData.map((item) => ({
          key: item.key,
          impressions: item.impressions,
          clicks: item.clicks,
        }))}
        sortConfig={topQueriesSort}
        onSort={(column) =>
          handleTopQueriesSort(column as "impressions" | "clicks")
        }
        isLoading={isLoading}
      />
    </div>
  );
};

export default DiscoveryPerformanceSection;
