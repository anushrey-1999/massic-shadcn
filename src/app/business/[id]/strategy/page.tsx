"use client";

import React from "react";
import { StrategyTableClient } from "@/components/organisms/StrategyTable/strategy-table-client";
import { AudienceTableClient } from "@/components/organisms/AudienceTable/audience-table-client";
import { LandscapeTableClient } from "@/components/organisms/LandscapeTable/landscape-table-client";
import { ThemesTableClient } from "@/components/organisms/ThemesTable/themes-table-client";
import { PageHeader } from "@/components/molecules/PageHeader";
import { WorkflowStatusBanner } from "@/components/molecules/WorkflowStatusBanner";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useStrategy } from "@/hooks/use-strategy";
import { useQuery } from "@tanstack/react-query";
import {
  BUSINESS_RELEVANCE_PALETTE,
  StrategyBubbleChart,
  type StrategyBubbleColorMetric,
} from "@/components/organisms/StrategyBubbleChart/strategy-bubble-chart";
import { Typography } from "@/components/ui/typography";
import { ChartScatter, CircleDot, List, ListFilter, Loader2 } from "lucide-react";
import type { StrategyMetrics } from "@/types/strategy-types";
import type { AudienceMetrics } from "@/types/audience-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getWorkflowStatus, isWorkflowSuccess } from "@/lib/workflow-status";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  skipEntitlements?: boolean;
}

type RelevanceFilter = "high" | "medium" | "low";

const RELEVANCE_FILTER_OPTIONS: Array<{
  value: RelevanceFilter;
  label: string;
  description: string;
}> = [
  { value: "high", label: "High", description: "More than 70%" },
  { value: "medium", label: "Medium", description: "40% to 70%" },
  { value: "low", label: "Low", description: "Less than 40%" },
];

function getRelevancePercent(score?: number) {
  if (score === undefined || score === null || !Number.isFinite(score)) return null;
  return score <= 1 ? score * 100 : score;
}

function matchesRelevanceFilter(score: number, filters: RelevanceFilter[]) {
  if (filters.length === 0) return true;

  const percent = getRelevancePercent(score);
  if (percent === null) return false;

  return filters.some((filter) => {
    if (filter === "high") return percent > 70;
    if (filter === "medium") return percent >= 40 && percent <= 70;
    return percent < 40;
  });
}

function StrategyMapRelevanceFilter({
  selectedFilters,
  onToggle,
  onReset,
  offeringOptions,
  selectedOffering,
  onOfferingChange,
  formatOfferingLabel,
}: {
  selectedFilters: RelevanceFilter[];
  onToggle: (value: RelevanceFilter) => void;
  onReset: () => void;
  offeringOptions: string[];
  selectedOffering: string;
  onOfferingChange: (value: string) => void;
  formatOfferingLabel: (value: string) => string;
}) {
  const selectedSet = React.useMemo(
    () => new Set(selectedFilters),
    [selectedFilters]
  );
  const activeFilterCount =
    selectedFilters.length + (selectedOffering === "all" ? 0 : 1);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label="Filter relevance"
          className={`h-10 font-normal ${activeFilterCount > 0
            ? "min-w-10 px-2 gap-1.5"
            : "w-10 p-0"
            }`}
        >
          <ListFilter className="text-muted-foreground h-4 w-4" />
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="h-[18.24px] rounded-[3.2px] px-[5.12px] font-mono font-normal text-[10.4px]"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex w-full max-w-(--radix-popover-content-available-width) flex-col gap-3.5 p-4 sm:min-w-[320px]"
      >
        <div className="flex flex-col gap-1">
          <h4 className="font-medium leading-none">
            {activeFilterCount > 0 ? "Filters" : "No filters applied"}
          </h4>
          <p className="text-muted-foreground text-sm">
            Filter topics by offering and business relevance.
          </p>
        </div>

        {offeringOptions.length > 0 ? (
          <div className="flex flex-col gap-2">
            <Typography
              variant="p"
              className="text-sm font-medium text-general-muted-foreground"
            >
              Offerings
            </Typography>
            <Select value={selectedOffering} onValueChange={onOfferingChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All offerings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offerings</SelectItem>
                {offeringOptions.map((offering) => (
                  <SelectItem key={offering} value={offering}>
                    {formatOfferingLabel(offering)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Typography
            variant="p"
            className="text-sm font-medium text-general-muted-foreground"
          >
            Relevance
          </Typography>
          {RELEVANCE_FILTER_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 hover:bg-accent"
            >
              <Checkbox
                checked={selectedSet.has(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>

        {activeFilterCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="w-fit rounded"
            onClick={onReset}
          >
            Reset filters
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function StrategyEntitledContent({ businessId }: { businessId: string }) {
  const [primaryTab, setPrimaryTab] = React.useState<
    "strategy" | "audience" | "landscape"
  >("strategy");
  const [topicTab, setTopicTab] = React.useState<"detailed" | "overview">(
    "detailed"
  );
  const [isStrategySplitView, setIsStrategySplitView] = React.useState(false);
  const [isAudienceSplitView, setIsAudienceSplitView] = React.useState(false);
  const [isThemesSplitView, setIsThemesSplitView] = React.useState(false);
  const [strategyView, setStrategyView] = React.useState<"list" | "bubble">(
    "list"
  );
  const [overviewView, setOverviewView] = React.useState<"table" | "bubble" | "scatter">(
    "table"
  );
  const [selectedOffering, setSelectedOffering] = React.useState<string>("all");
  const [bubbleColorMetric, setBubbleColorMetric] =
    React.useState<StrategyBubbleColorMetric>("topicCoverage");
  const [selectedRelevanceFilters, setSelectedRelevanceFilters] =
    React.useState<RelevanceFilter[]>([]);

  const router = useRouter();
  const pathname = usePathname();
  const { data: jobDetails } = useJobByBusinessId(businessId || null);
  const coreStatus = getWorkflowStatus(jobDetails, "core") ?? jobDetails?.workflow_status?.status;
  const isCoreSuccess = coreStatus === "success";
  const isStrategyReady = isCoreSuccess && isWorkflowSuccess(jobDetails, "topics");
  const isAudienceReady = isCoreSuccess && isWorkflowSuccess(jobDetails, "audiences");
  const isLandscapeReady = isCoreSuccess && isWorkflowSuccess(jobDetails, "social_channels");

  const { fetchAllStrategyPages } = useStrategy(businessId);
  const [strategyMetrics, setStrategyMetrics] = React.useState<StrategyMetrics | null>(null);
  const [audienceMetrics, setAudienceMetrics] = React.useState<AudienceMetrics | null>(null);
  const [themesMetricsText, setThemesMetricsText] = React.useState("Loading metrics...");

  // Fetch all strategy pages upfront so bubble map data is ready immediately
  const {
    data: fullData,
    isLoading: isLoadingFullData,
    error: fullDataError,
  } = useQuery({
    queryKey: ["strategy-full-data", businessId],
    queryFn: () => fetchAllStrategyPages(businessId),
    enabled: strategyView === "bubble" && isStrategyReady && !!businessId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const formatOfferingLabel = React.useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return value;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }, []);

  const offeringOptions = React.useMemo(() => {
    const rows = fullData?.data ?? [];
    const unique = new Set<string>();

    for (const row of rows) {
      const offerings = Array.isArray(row.offerings) ? row.offerings : [];
      for (const offering of offerings) {
        if (typeof offering !== "string") continue;
        const trimmed = offering.trim();
        if (trimmed) unique.add(trimmed);
      }
    }

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [fullData?.data]);

  React.useEffect(() => {
    if (selectedOffering === "all") return;
    if (offeringOptions.includes(selectedOffering)) return;
    setSelectedOffering("all");
  }, [offeringOptions, selectedOffering]);

  const toggleRelevanceFilter = React.useCallback((value: RelevanceFilter) => {
    setSelectedRelevanceFilters((current) =>
      current.includes(value)
        ? current.filter((filter) => filter !== value)
        : [...current, value]
    );
  }, []);

  const resetRelevanceFilters = React.useCallback(() => {
    setSelectedRelevanceFilters([]);
    setSelectedOffering("all");
  }, []);

  const filteredBubbleData = React.useMemo(() => {
    const rows = fullData?.data ?? [];

    return rows.filter((row) => {
      const offerings = Array.isArray(row.offerings) ? row.offerings : [];
      const matchesOffering =
        selectedOffering === "all" ||
        offerings.some(
          (o) => typeof o === "string" && o.trim() === selectedOffering
        );

      return (
        matchesOffering &&
        matchesRelevanceFilter(
          row.business_relevance_score,
          selectedRelevanceFilters
        )
      );
    });
  }, [fullData?.data, selectedOffering, selectedRelevanceFilters]);

  const headerMetricsText = React.useMemo(() => {
    if (primaryTab === "strategy") {
      if (topicTab === "overview") return themesMetricsText;
      if (!isStrategyReady) return "Workflow processing...";
      if (!strategyMetrics) return "Loading metrics...";
      return `${strategyMetrics.total_topics} Topics, ${strategyMetrics.total_clusters} Sub Topics and ${strategyMetrics.total_keywords} Keywords`;
    }

    if (primaryTab === "audience") {
      if (!isAudienceReady) return "Workflow processing...";
      if (!audienceMetrics) return "Loading metrics...";
      return `${audienceMetrics.total_personas} Personas, ${audienceMetrics.total_use_cases} Use Cases and ${audienceMetrics.total_supporting_keywords} Supporting Keywords`;
    }

    return "";
  }, [audienceMetrics, isAudienceReady, isStrategyReady, primaryTab, strategyMetrics, themesMetricsText, topicTab]);

  const handlePrimaryTabChange = React.useCallback(
    (value: string) => {
      setPrimaryTab(value as "strategy" | "audience" | "landscape");
      router.replace(pathname);
    },
    [router, pathname]
  );

  const handleStrategyViewChange = React.useCallback((view: "list" | "bubble") => {
    setStrategyView(view);
    setOverviewView(view === "bubble" ? "bubble" : "table");
  }, []);

  const handleOverviewViewChange = React.useCallback((view: "table" | "bubble" | "scatter") => {
    setOverviewView(view);
    if (view === "bubble") {
      setStrategyView("bubble");
    } else if (view === "table") {
      setStrategyView("list");
    }
  }, []);

  const handleTopicTabChange = React.useCallback(
    (value: string) => {
      const nextTab = value as "detailed" | "overview";

      if (nextTab === "overview" && strategyView === "bubble") {
        setOverviewView("bubble");
      }

      if (nextTab === "detailed") {
        if (overviewView === "bubble") {
          setStrategyView("bubble");
        } else {
          setStrategyView("list");
        }
      }

      setTopicTab(nextTab);
    },
    [overviewView, strategyView]
  );

  const subtabLabelClass =
    "flex h-8 cursor-pointer items-center rounded-[10px] px-4 text-sm font-normal text-foreground transition-colors hover:bg-white/40";
  const activeSubtabGroupClass =
    "inline-flex h-8 items-center gap-1 rounded-[10px] bg-white pr-1 shadow-[0_1px_4px_rgba(0,0,0,0.2)]";
  const activeSubtabLabelClass =
    "flex h-8 cursor-pointer items-center rounded-[10px] px-4 text-sm font-normal text-foreground";
  const subtabIconClass =
    "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors";
  const activeSubtabIconClass =
    "bg-general-primary text-general-primary-foreground";
  const inactiveSubtabIconClass =
    "text-foreground hover:bg-general-border";

  const strategyViewControls = (
    <div
      role="group"
      aria-label="Strategy detail and view controls"
      className="inline-flex h-[40px] shrink-0 items-center rounded-[14px] bg-general-border p-1 text-foreground"
    >
      {topicTab === "detailed" ? (
        <div className={activeSubtabGroupClass}>
          <button
            type="button"
            onClick={() => handleTopicTabChange("detailed")}
            className={activeSubtabLabelClass}
          >
            Detailed
          </button>
          <button
            type="button"
            aria-label="Show detailed list"
            onClick={() => handleStrategyViewChange("list")}
            className={cn(
              subtabIconClass,
              strategyView === "list"
                ? activeSubtabIconClass
                : inactiveSubtabIconClass
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Show detailed map"
            onClick={() => handleStrategyViewChange("bubble")}
            className={cn(
              subtabIconClass,
              strategyView === "bubble"
                ? activeSubtabIconClass
                : inactiveSubtabIconClass
            )}
          >
            <CircleDot className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => handleTopicTabChange("detailed")}
          className={subtabLabelClass}
        >
          Detailed
        </button>
      )}
      {topicTab === "overview" ? (
        <div className={activeSubtabGroupClass}>
          <button
            type="button"
            onClick={() => handleTopicTabChange("overview")}
            className={activeSubtabLabelClass}
          >
            Overview
          </button>
          <button
            type="button"
            aria-label="Show overview list"
            onClick={() => handleOverviewViewChange("table")}
            className={cn(
              subtabIconClass,
              overviewView === "table"
                ? activeSubtabIconClass
                : inactiveSubtabIconClass
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Show overview map"
            onClick={() => handleOverviewViewChange("bubble")}
            className={cn(
              subtabIconClass,
              overviewView === "bubble"
                ? activeSubtabIconClass
                : inactiveSubtabIconClass
            )}
          >
            <CircleDot className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Show overview scatter"
            onClick={() => handleOverviewViewChange("scatter")}
            className={cn(
              subtabIconClass,
              overviewView === "scatter"
                ? activeSubtabIconClass
                : inactiveSubtabIconClass
            )}
          >
            <ChartScatter className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => handleTopicTabChange("overview")}
          className={subtabLabelClass}
        >
          Overview
        </button>
      )}
    </div>
  );

  const isAnySplitView = isStrategySplitView || isAudienceSplitView || isThemesSplitView;

  return (
    <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
      <Tabs
        value={primaryTab}
        onValueChange={handlePrimaryTabChange}
        className="flex flex-col flex-1 min-h-0"
      >
        {!isAnySplitView && (
          <div className="shrink-0 flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="strategy">Topics</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="landscape">Landscape</TabsTrigger>
            </TabsList>
            <Typography
              variant="p"
              className="text-sm font-mono text-general-muted-foreground"
            >
              {headerMetricsText}
            </Typography>
          </div>
        )}
        <TabsContent
          value="strategy"
          className={cn(
            "flex-1 min-h-0 overflow-hidden flex flex-col",
            !isAnySplitView && "mt-4"
          )}
        >
          <Tabs
            value={topicTab}
            onValueChange={handleTopicTabChange}
            className="flex flex-col flex-1 min-h-0"
          >
            {!isStrategySplitView && !isThemesSplitView && !isStrategyReady && (
              <TabsList className="shrink-0">
                <TabsTrigger value="detailed">Detailed</TabsTrigger>
                <TabsTrigger value="overview">Overview</TabsTrigger>
              </TabsList>
            )}
            <TabsContent
              value="detailed"
              className={cn(
                "flex-1 min-h-0 overflow-hidden flex flex-col",
                !isStrategySplitView && !isThemesSplitView && !isStrategyReady && "mt-4"
              )}
            >
              {isStrategyReady ? (
                strategyView === "list" ? (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <StrategyTableClient
                      businessId={businessId}
                      onSplitViewChange={setIsStrategySplitView}
                      toolbarRightPrefix={strategyViewControls}
                      onMetricsChange={setStrategyMetrics}
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="bg-white rounded-lg p-4 h-full flex flex-col gap-2.5 overflow-hidden">
                      <div className="flex w-full items-start justify-between gap-2 p-1">
                        <div>
                          <Select
                            value={bubbleColorMetric}
                            onValueChange={(value) =>
                              setBubbleColorMetric(value as StrategyBubbleColorMetric)
                            }
                          >
                            <SelectTrigger className="mb-2 w-[220px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="topicCoverage">
                                Topic Coverage
                              </SelectItem>
                              <SelectItem value="businessRelevance">
                                Business Relevance
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="relative h-5 w-[320px] max-w-full rounded-full overflow-hidden">
                            <div className="absolute inset-0 flex">
                              {BUSINESS_RELEVANCE_PALETTE.map((color) => (
                                <div
                                  key={color}
                                  className="h-full flex-1 shadow-inner"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-between px-3">
                              <span className="text-[10px] font-medium text-general-muted-foreground">
                                Low
                              </span>
                              <span className="text-[10px] font-medium text-general-muted-foreground">
                                High
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <StrategyMapRelevanceFilter
                            selectedFilters={selectedRelevanceFilters}
                            onToggle={toggleRelevanceFilter}
                            onReset={resetRelevanceFilters}
                            offeringOptions={offeringOptions}
                            selectedOffering={selectedOffering}
                            onOfferingChange={setSelectedOffering}
                            formatOfferingLabel={formatOfferingLabel}
                          />
                          {strategyViewControls}
                        </div>
                      </div>
                      <div className="flex-1 min-h-0">
                        {isLoadingFullData ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Loading..</span>
                            </div>
                          </div>
                        ) : fullDataError ? (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-destructive">
                              Error loading data: {String(fullDataError)}
                            </p>
                          </div>
                        ) : fullData?.data ? (
                          <StrategyBubbleChart
                            data={filteredBubbleData}
                            colorMetric={bubbleColorMetric}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">
                              No data available.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <WorkflowStatusBanner
                  businessId={businessId}
                  workflowKey="topic_strategy_builder"
                  emptyStateHeight="min-h-[calc(100vh-16rem)]"
                />
              )}
            </TabsContent>
            <TabsContent
              value="overview"
              className={cn(
                "flex-1 min-h-0 overflow-hidden",
                !isStrategySplitView && !isThemesSplitView && !isStrategyReady && "mt-4"
              )}
            >
              <ThemesTableClient
                businessId={businessId}
                onSplitViewChange={setIsThemesSplitView}
                onMetricsTextChange={setThemesMetricsText}
                toolbarRightPrefix={strategyViewControls}
                view={overviewView}
                onViewChange={handleOverviewViewChange}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent
          value="audience"
          className={cn(
            "flex-1 min-h-0 overflow-hidden",
            !isAnySplitView && "mt-4"
          )}
        >
          {isAudienceReady ? (
            <AudienceTableClient
              businessId={businessId}
              onSplitViewChange={setIsAudienceSplitView}
              onMetricsChange={setAudienceMetrics}
            />
          ) : (
            <WorkflowStatusBanner
              businessId={businessId}
              workflowKey="audiences"
              emptyStateHeight="min-h-[calc(100vh-16rem)]"
            />
          )}
        </TabsContent>
        <TabsContent
          value="landscape"
          className={cn(
            "flex-1 min-h-0 overflow-hidden",
            !isAnySplitView && "mt-4"
          )}
        >
          {isLandscapeReady ? (
            <LandscapeTableClient businessId={businessId} />
          ) : (
            <WorkflowStatusBanner
              businessId={businessId}
              workflowKey="social_channels"
              emptyStateHeight="min-h-[calc(100vh-16rem)]"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function BusinessStrategyPage({ params, skipEntitlements = false }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>("");

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id));
  }, [params]);

  const { profileData, profileDataLoading } = useBusinessProfileById(
    businessId || null
  );
  const { data: jobDetails, isLoading: jobDetailsLoading } = useJobByBusinessId(
    businessId || null
  );
  const coreStatus = getWorkflowStatus(jobDetails, "core") ?? jobDetails?.workflow_status?.status;
  const showMainContent = coreStatus === "success";

  const businessName =
    profileData?.Name || profileData?.DisplayName || "Business";

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Strategy", href: `/business/${businessId}/strategy` },
    ],
    [businessName, businessId]
  );

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (profileDataLoading) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader breadcrumbs={breadcrumbs} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const content = !jobDetailsLoading && showMainContent ? (
    <StrategyEntitledContent businessId={businessId} />
  ) : (
    <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
      <WorkflowStatusBanner
        businessId={businessId}
        emptyStateHeight="min-h-[calc(100vh-12rem)]"
      />
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} />
      {skipEntitlements ? (
        content
      ) : (
        <EntitlementsGuard entitlement="strategy" businessId={businessId}>
          {content}
        </EntitlementsGuard>
      )}
    </div>
  );
}
