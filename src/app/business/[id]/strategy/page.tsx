"use client";

import React from "react";
import { StrategyTableClient } from "@/components/organisms/StrategyTable/strategy-table-client";
import { AudienceTableClient } from "@/components/organisms/AudienceTable/audience-table-client";
import { LandscapeTableClient } from "@/components/organisms/LandscapeTable/landscape-table-client";
import { PageHeader } from "@/components/molecules/PageHeader";
import { WorkflowStatusBanner } from "@/components/molecules/WorkflowStatusBanner";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useStrategy } from "@/hooks/use-strategy";
import { useQuery } from "@tanstack/react-query";
import {
  BUSINESS_RELEVANCE_PALETTE,
  StrategyBubbleChart,
} from "@/components/organisms/StrategyBubbleChart/strategy-bubble-chart";
import { Card } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { CircleDot, List, Loader2 } from "lucide-react";
import type { StrategyMetrics } from "@/types/strategy-types";
import type { AudienceMetrics } from "@/types/audience-types";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

function StrategyEntitledContent({ businessId }: { businessId: string }) {
  const [primaryTab, setPrimaryTab] = React.useState<
    "strategy" | "audience" | "landscape"
  >("strategy");
  const [isStrategySplitView, setIsStrategySplitView] = React.useState(false);
  const [isAudienceSplitView, setIsAudienceSplitView] = React.useState(false);
  const [strategyView, setStrategyView] = React.useState<"list" | "bubble">(
    "list"
  );

  const router = useRouter();
  const pathname = usePathname();

  const { fetchFullDataFromDownloadUrl } = useStrategy(businessId);
  const [strategyMetrics, setStrategyMetrics] = React.useState<StrategyMetrics | null>(null);
  const [audienceMetrics, setAudienceMetrics] = React.useState<AudienceMetrics | null>(null);

  // Fetch full data for bubble chart when bubble view is active
  const {
    data: fullData,
    isLoading: isLoadingFullData,
    error: fullDataError,
  } = useQuery({
    queryKey: ["strategy-full-data", businessId],
    queryFn: () => fetchFullDataFromDownloadUrl(businessId),
    enabled: strategyView === "bubble" && !!businessId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const headerMetricsText = React.useMemo(() => {
    if (primaryTab === "strategy") {
      if (!strategyMetrics) return "Loading metrics...";
      return `${strategyMetrics.total_topics} Topics, ${strategyMetrics.total_clusters} Sub Topics and ${strategyMetrics.total_keywords} Keywords`;
    }

    if (primaryTab === "audience") {
      if (!audienceMetrics) return "Loading metrics...";
      return `${audienceMetrics.total_personas} Personas, ${audienceMetrics.total_use_cases} Use Cases and ${audienceMetrics.total_supporting_keywords} Supporting Keywords`;
    }

    return "";
  }, [audienceMetrics, primaryTab, strategyMetrics]);

  const handlePrimaryTabChange = React.useCallback(
    (value: string) => {
      setPrimaryTab(value as "strategy" | "audience" | "landscape");
      router.replace(pathname);
    },
    [router, pathname]
  );

  const strategyViewTabs = (
    <Tabs
      value={strategyView}
      onValueChange={(value) => setStrategyView(value as "list" | "bubble")}
      className="shrink-0"
    >
      <TabsList className="">
        <TabsTrigger value="list">
          <List />
          List
        </TabsTrigger>
        <TabsTrigger value="bubble">
          <CircleDot />
          Map
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
      <Tabs
        value={primaryTab}
        onValueChange={handlePrimaryTabChange}
        className="flex flex-col flex-1 min-h-0"
      >
        {!(isStrategySplitView || isAudienceSplitView) && (
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
            !(isStrategySplitView || isAudienceSplitView) && "mt-4"
          )}
        >
          {strategyView === "list" ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <StrategyTableClient
                businessId={businessId}
                onSplitViewChange={setIsStrategySplitView}
                toolbarRightPrefix={strategyViewTabs}
                onMetricsChange={setStrategyMetrics}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden">
              <Card className="h-full w-full p-4 rounded-lg border-none shadow-none flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Typography
                      variant="p"
                      className="font-mono mb-2 text-base text-general-muted-foreground"
                    >
                      Topic Coverage
                    </Typography>
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

                  <div className="flex items-center gap-4">
                    <Typography
                      variant="p"
                      className="text-base font-mono text-general-muted-foreground"
                    >
                      {fullData?.data
                        ? `${fullData.data.length} total topic${
                            fullData.data.length === 1 ? "" : "s"
                          }`
                        : isLoadingFullData
                        ? "Loading.."
                        : "No data"}
                    </Typography>
                    {strategyViewTabs}
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
                    <StrategyBubbleChart data={fullData.data} />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">
                        No data available.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
        <TabsContent
          value="audience"
          className={cn(
            "flex-1 min-h-0 overflow-hidden",
            !(isStrategySplitView || isAudienceSplitView) && "mt-4"
          )}
        >
          <AudienceTableClient
            businessId={businessId}
            onSplitViewChange={setIsAudienceSplitView}
            onMetricsChange={setAudienceMetrics}
          />
        </TabsContent>
        <TabsContent
          value="landscape"
          className={cn(
            "flex-1 min-h-0 overflow-hidden",
            !(isStrategySplitView || isAudienceSplitView) && "mt-4"
          )}
        >
          <LandscapeTableClient businessId={businessId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function BusinessStrategyPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>("");

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id));
  }, [params]);

  const { profileData, profileDataLoading } = useBusinessProfileById(
    businessId || null
  );

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

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} />
      <EntitlementsGuard entitlement="strategy" businessId={businessId}>
        <WorkflowStatusBanner
          businessId={businessId}
          emptyStateHeight="h-[calc(100vh-12rem)]"
        />
        <StrategyEntitledContent businessId={businessId} />
      </EntitlementsGuard>
    </div>
  );
}
