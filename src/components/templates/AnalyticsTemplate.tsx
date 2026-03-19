"use client";

import { useState, useEffect, useMemo, useCallback, startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Eye, MousePointerClick, Target, BarChart3 } from "lucide-react";
import {
  OrganicPerformanceSection,
} from "@/components/organisms/analytics/OrganicPerformanceSection";
import {
  AnalyticsFilterControls,
  AnalyticsReportsActions,
  PeriodSelector,
  type AnalyticsGroupBy,
  type AnalyticsKeywordScope,
} from "../molecules/analytics";
import { PageHeader } from "@/components/molecules/PageHeader";
import { type TimePeriodValue } from "@/hooks/use-gsc-analytics";
import { useBusinessStore } from "@/store/business-store";
import DiscoveryPerformanceSection from "@/components/organisms/analytics/DiscoveryPerformanceSection";
import { LocalSearchSection } from "@/components/organisms/analytics/LocalSearchSection";
import SourcesSection from "@/components/organisms/analytics/SourcesSection";
import ConversionSection from "@/components/organisms/analytics/ConversionSection";
import { Button } from "@/components/ui/button";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { PlanModal } from "@/components/molecules/settings/PlanModal";
import { useEntitlementGate } from "@/hooks/use-entitlement-gate";
import { usePrefetchAnalyticsPages } from "@/hooks/use-prefetch-analytics-pages";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useOrganicDeepdiveFilters,
  type DeepdiveKeywordScope,
  type DeepdiveFilter,
} from "@/hooks/use-organic-deepdive-filters";
import { OrganicDeepdiveHeader } from "@/components/organisms/organic-deepdive/OrganicDeepdiveHeader";
import { getFallbackAnalyticsGrouping } from "@/utils/analytics-chart-grouping";
import { CustomContentGroupsModal } from "@/components/molecules/analytics/CustomContentGroupsModal";

const CHART_LINE_KEYS = ["impressions", "clicks", "sessions", "goals"] as const;
const METRIC_TOOLTIPS: Record<(typeof CHART_LINE_KEYS)[number], string> = {
  impressions: "Impressions",
  clicks: "Clicks",
  sessions: "Sessions",
  goals: "Goals",
};
const ALL_GROUP_BY_OPTIONS: AnalyticsGroupBy[] = ["day", "week", "month"];

function normalizeBrandTerms(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((term) => String(term || "").trim())
      .filter(Boolean);
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((term) => String(term || "").trim())
          .filter(Boolean);
      }
    } catch {
      return raw
        .split(",")
        .map((term) => term.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export function AnalyticsTemplate() {
  const [selectedPeriod, setSelectedPeriod] =
    useState<TimePeriodValue>("3 months");
  const [selectedTab, setSelectedTab] = useState<"all" | "organic">("all");
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>("day");
  const [availableGroupByOptions, setAvailableGroupByOptions] =
    useState<AnalyticsGroupBy[]>(ALL_GROUP_BY_OPTIONS);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [customContentGroupsOpen, setCustomContentGroupsOpen] = useState(false);
  const [showDeferredSections, setShowDeferredSections] = useState(false);
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    impressions: true,
    clicks: true,
    sessions: true,
    goals: true,
  });
  const overviewVisibleLines =
    selectedTab === "all"
      ? { impressions: false, clicks: false, sessions: true, goals: true }
      : visibleLines;

  const handleChartLineToggle = useCallback((key: string, checked: boolean) => {
    setVisibleLines((prev) => {
      const checkedCount = Object.values(prev).filter(Boolean).length;
      if (!checked && checkedCount <= 1) return prev;
      return { ...prev, [key]: checked };
    });
  }, []);

  const pathname = usePathname();
  const router = useRouter();
  const profiles = useBusinessStore((state) => state.profiles);

  const { businessId, businessProfile } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/);
    if (!match)
      return { businessId: null as string | null, businessProfile: null };

    const id = match[1];
    const profile = profiles.find((p) => p.UniqueId === id);
    return { businessId: id, businessProfile: profile || null };
  }, [pathname, profiles]);

  const { profileData } = useBusinessProfileById(businessId);
  const { prefetchPage1 } = usePrefetchAnalyticsPages(businessId);

  useEffect(() => {
    if (businessId) {
      let cleanup: (() => void) | undefined;
      prefetchPage1().then((cleanupFn) => {
        cleanup = cleanupFn;
      });
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [businessId, prefetchPage1]);

  const isTrialActive =
    ((profileData as any)?.isTrialActive ??
      (businessProfile as any)?.isTrialActive) === true;

  const remainingTrialDays =
    typeof (profileData as any)?.remainingTrialDays === "number"
      ? (profileData as any).remainingTrialDays
      : typeof (businessProfile as any)?.remainingTrialDays === "number"
        ? (businessProfile as any).remainingTrialDays
        : undefined;

  const { getCurrentPlan, computedAlertMessage, handleSubscribe, gateLoading, subscriptionData } =
    useEntitlementGate({
      entitlement: "strategy",
      businessId: businessId || undefined,
      alertMessage:
        "Free trial active. Upgrade anytime to unlock all features.",
    });

  const isWhitelisted =
    (subscriptionData as any)?.whitelisted === true ||
    (subscriptionData as any)?.status === "whitelisted";

  const showTrialBanner = isTrialActive && !isWhitelisted;

  const businessName =
    businessProfile?.Name || businessProfile?.DisplayName || "Business";

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      {
        label: "Analytics",
        href: businessId ? `/business/${businessId}/analytics` : undefined,
      },
    ],
    [businessName, businessId]
  );

  const localSearchLocations = useMemo(() => {
    const locs = (profileData as any)?.Locations ?? businessProfile?.Locations ?? [];
    return (locs as { Name?: string; DisplayName?: string }[]).map((loc) => ({
      value: loc.Name ?? "",
      label: loc.DisplayName || loc.Name || "",
    }));
  }, [profileData, businessProfile]);
  const brandTerms = useMemo(
    () =>
      normalizeBrandTerms(
        (profileData as any)?.BrandTerms ??
          (profileData as any)?.brand_terms ??
          businessProfile?.BrandTerms
      ),
    [profileData, businessProfile?.BrandTerms]
  );
  const {
    filters,
    filtersForApi,
    addFilter,
    removeFilter,
    clearAllFilters,
    keywordScopeFilter,
  } = useOrganicDeepdiveFilters(brandTerms);
  const keywordScope = (keywordScopeFilter?.expression ??
    "all") as AnalyticsKeywordScope;
  const headerMetricKeys =
    selectedTab === "all"
      ? (["sessions", "goals"] as const)
      : CHART_LINE_KEYS;

  const handleOverviewFilterSelect = useCallback((filter: DeepdiveFilter) => {
    addFilter(filter);
  }, [addFilter]);

  const handleKeywordScopeChange = useCallback(
    (value: AnalyticsKeywordScope) => {
      if (value === "all") {
        removeFilter("keyword_scope");
        return;
      }

      addFilter({
        dimension: "keyword_scope",
        expression: value as DeepdiveKeywordScope,
        operator: "equals",
      });
    },
    [addFilter, removeFilter]
  );

  const handleTabChange = useCallback(
    (value: string) => {
      const nextTab = value as "all" | "organic";

      if (nextTab === selectedTab) return;

      setSelectedTab(nextTab);

      if (filters.length > 0) {
        clearAllFilters();
      }
    },
    [clearAllFilters, filters.length, selectedTab]
  );

  useEffect(() => {
    if (availableGroupByOptions.includes(groupBy)) return;
    setGroupBy(getFallbackAnalyticsGrouping(groupBy, availableGroupByOptions));
  }, [availableGroupByOptions, groupBy]);

  useEffect(() => {
    if (selectedTab !== "all" || keywordScope === "all") return;
    removeFilter("keyword_scope");
  }, [keywordScope, removeFilter, selectedTab]);

  useEffect(() => {
    setShowDeferredSections(false);

    let completed = false;
    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const revealDeferredSections = () => {
      if (completed) return;
      completed = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      startTransition(() => {
        setShowDeferredSections(true);
      });
    };

    timeoutId = window.setTimeout(revealDeferredSections, 250);

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(revealDeferredSections);
    }

    return () => {
      completed = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [businessId]);

  return (
    <div className="flex flex-col min-h-screen scroll-smooth ">
      <PlanModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        currentPlan={isWhitelisted ? "Whitelisted" : showTrialBanner ? "Free Trial" : getCurrentPlan()}
        showFooterButtons={true}
        showAlertBar={true}
        alertSeverity="error"
        alertMessage={computedAlertMessage}
        isDescription={false}
        onSelectPlan={handleSubscribe}
        loading={gateLoading}
      />

      {/* Sticky Header with Breadcrumb and Tabs */}
      <div className="sticky top-0 z-11 bg-foreground-light border-b border-general-border">
        <PageHeader
          trial={
            showTrialBanner
              ? {
                remainingDays: remainingTrialDays,
              }
              : undefined
          }
          onUpgrade={() => {
            if (!gateLoading) setUpgradeOpen(true);
          }}
          breadcrumbs={breadcrumbs}
        />
        <div className="w-full max-w-[1224px] px-7 flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <Tabs
              className="gap-0"
              value={selectedTab}
              onValueChange={handleTabChange}
            >
              <TabsList className="h-auto w-[206px] rounded-[12px] bg-general-border p-1">
                <TabsTrigger
                  value="all"
                  className="min-h-8 rounded-[10px] px-4 py-[5.5px] text-sm leading-6 tracking-[0.07px]"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="organic"
                  className="min-h-8 rounded-[10px] px-4 py-[5.5px] text-sm leading-6 tracking-[0.07px]"
                >
                  Organic
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="h-12 w-px shrink-0 bg-general-border" aria-hidden="true" />
            <AnalyticsReportsActions
              onViewReports={() => {
                if (!businessId) return;
                router.push(`/business/${businessId}/reports`);
              }}
              onContentGroupsClick={() => {
                if (!businessId) return;
                setCustomContentGroupsOpen(true);
              }}
              reportsDisabled={!businessId}
              contentGroupsDisabled={!businessId}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {headerMetricKeys.map((key) => (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-9 w-9 shrink-0 rounded-[8px] border-general-border bg-white shadow-xs",
                        selectedTab === "all" && "cursor-default opacity-70",
                        selectedTab !== "all" && !visibleLines[key] && "bg-transparent shadow-none"
                      )}
                      onClick={() => {
                        if (selectedTab === "all") return;
                        handleChartLineToggle(key, !visibleLines[key]);
                      }}
                      disabled={selectedTab === "all"}
                      aria-label={METRIC_TOOLTIPS[key]}
                      aria-pressed={selectedTab === "all" ? true : visibleLines[key]}
                    >
                      {key === "impressions" ? (
                        <Eye className="h-4 w-4 text-[#a855f7]" />
                      ) : key === "clicks" ? (
                        <MousePointerClick className="h-4 w-4 rotate-90 text-[#2563eb]" />
                      ) : key === "sessions" ? (
                        <BarChart3 className="h-4 w-4 text-[#f97316]" />
                      ) : (
                        <Target className="h-4 w-4 text-[#10b981]" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    {METRIC_TOOLTIPS[key]}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <div className="h-12 w-px shrink-0 bg-general-border" aria-hidden="true" />
            <AnalyticsFilterControls
              periodSelector={
                <PeriodSelector
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                  disabledGroupByOptions={ALL_GROUP_BY_OPTIONS.filter(
                    (option) => !availableGroupByOptions.includes(option)
                  )}
                  className="h-10 cursor-pointer rounded-[8px] border-[#d4d4d4] bg-transparent px-4 py-[7.5px] text-sm font-medium tracking-[0.07px] shadow-none"
                />
              }
              keywordScope={keywordScope}
              onKeywordScopeChange={handleKeywordScopeChange}
              showKeywordScope={selectedTab === "organic"}
              hasActiveKeywordScope={keywordScope !== "all"}
            />
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

      {/* Tab Content */}
      <div className="w-full max-w-[1224px] flex flex-col">
        <div className="p-7 pb-10">
          <OrganicPerformanceSection
            period={selectedPeriod}
            visibleLines={overviewVisibleLines}
            onLegendToggle={handleChartLineToggle}
            filters={filtersForApi}
            funnelVariant={selectedTab === "all" ? "sessions-goals" : "default"}
            ga4TrafficScope={selectedTab}
            groupBy={groupBy}
            onAvailableGroupingsChange={setAvailableGroupByOptions}
          />
        </div>
        <DiscoveryPerformanceSection
          period={selectedPeriod}
          visibleMetrics={overviewVisibleLines}
          filters={filtersForApi}
          onSelectFilter={handleOverviewFilterSelect}
          onOpenCustomContentGroups={() => setCustomContentGroupsOpen(true)}
          hideTopQueries={selectedTab === "all"}
          hideHowYouRank={selectedTab === "all"}
          ga4TrafficScope={selectedTab}
        />
        {showDeferredSections ? (
          <>
            <SourcesSection
              period={selectedPeriod}
              hideChannelsChart={selectedTab === "organic"}
              ga4TrafficScope={selectedTab}
            />
            <ConversionSection
              period={selectedPeriod}
              ga4TrafficScope={selectedTab}
            />
            <LocalSearchSection period={selectedPeriod} locations={localSearchLocations} />
          </>
        ) : null}
      </div>

      <CustomContentGroupsModal
        open={customContentGroupsOpen}
        onOpenChange={setCustomContentGroupsOpen}
        businessUniqueId={businessId}
        siteUrl={businessProfile?.Website || null}
        period={selectedPeriod}
        trafficScope={selectedTab}
      />
    </div>
  );
}
