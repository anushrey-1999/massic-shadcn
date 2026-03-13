"use client";

import { useState, useEffect, useMemo, useCallback, startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Eye, MousePointerClick, Target, BarChart3, FileChartColumn } from "lucide-react";
import {
  OrganicPerformanceSection,
} from "@/components/organisms/analytics/OrganicPerformanceSection";
import { PeriodSelector } from "../molecules/analytics";
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
  type DeepdiveFilter,
} from "@/hooks/use-organic-deepdive-filters";
import { OrganicDeepdiveHeader } from "@/components/organisms/organic-deepdive/OrganicDeepdiveHeader";

const CHART_LINE_KEYS = ["impressions", "clicks", "sessions", "goals"] as const;
const METRIC_TOOLTIPS: Record<(typeof CHART_LINE_KEYS)[number], string> = {
  impressions: "Impressions",
  clicks: "Clicks",
  sessions: "Sessions",
  goals: "Goals",
};

export function AnalyticsTemplate() {
  const [selectedPeriod, setSelectedPeriod] =
    useState<TimePeriodValue>("3 months");
  const [selectedTab, setSelectedTab] = useState<"all" | "organic">("all");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
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
  const { filters, filtersForApi, addFilter, removeFilter } = useOrganicDeepdiveFilters();
  const headerMetricKeys =
    selectedTab === "all"
      ? (["sessions", "goals"] as const)
      : CHART_LINE_KEYS;

  const handleOverviewFilterSelect = useCallback((filter: DeepdiveFilter) => {
    addFilter(filter);
  }, [addFilter]);

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
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "all" | "organic")}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="organic">Organic</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            {headerMetricKeys.map((key) => (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-8 w-8 shrink-0",
                      selectedTab === "all"
                        ? "bg-white"
                        : visibleLines[key]
                          ? "bg-white"
                          : "bg-transparent"
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
                      <Eye className="h-4 w-4 text-gray-500" />
                    ) : key === "clicks" ? (
                      <MousePointerClick className="h-4 w-4 text-blue-600 rotate-90" />
                    ) : key === "sessions" ? (
                      <BarChart3 className="h-4 w-4 text-orange-600" />
                    ) : (
                      <Target className="h-4 w-4 text-emerald-600" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  {METRIC_TOOLTIPS[key]}
                </TooltipContent>
              </Tooltip>
            ))}
            <PeriodSelector
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
              className="h-10"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 shrink-0 gap-2 bg-transparent"
                  onClick={() => {
                    if (!businessId) return;
                    router.push(`/business/${businessId}/reports`);
                  }}
                  disabled={!businessId}
                >
                  <FileChartColumn className="h-4 w-4" />
                  View Reports
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                View Reports
              </TooltipContent>
            </Tooltip>
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
          />
        </div>
        <DiscoveryPerformanceSection
          period={selectedPeriod}
          visibleMetrics={visibleLines}
          filters={filtersForApi}
          onSelectFilter={handleOverviewFilterSelect}
          hideTopQueries={selectedTab === "all"}
          hideHowYouRank={selectedTab === "all"}
        />
        {showDeferredSections ? (
          <>
            <SourcesSection
              period={selectedPeriod}
              hideChannelsChart={selectedTab === "organic"}
            />
            <ConversionSection
              period={selectedPeriod}
            />
            <LocalSearchSection period={selectedPeriod} locations={localSearchLocations} />
          </>
        ) : null}
      </div>
    </div>
  );
}
