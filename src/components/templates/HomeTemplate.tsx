"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";
import { useBusinessProfiles } from "@/hooks/use-business-profiles";
import {
  useBusinessPreviews,
  type BusinessPreviewItem,
} from "@/hooks/use-business-previews";
import { useGoogleAccounts } from "@/hooks/use-google-accounts";
import { useDashboardTags } from "@/hooks/use-dashboard-tags";
import {
  useHealthStatusBatch,
  type HealthStatusRow,
} from "@/hooks/use-health-status";
import { api } from "@/hooks/use-api";
import type { JobDetails } from "@/hooks/use-jobs";
import { cn } from "@/lib/utils";
import { BusinessPreviewCard } from "@/components/molecules/home/BusinessPreviewCard";
import { OnboardingCard } from "@/components/molecules/home/OnboardingCard";
import { Typography } from "@/components/ui/typography";
import { EmptyState } from "@/components/molecules/EmptyState";
import {
  HOME_PERIODS,
  HOME_SIGNAL_FILTERS,
  HomeFilterBar,
  HomePeriodSelector,
  type HomePeriodValue,
  type HomeSignalCounts,
  type HomeSignalFilterValue,
} from "@/components/molecules/home/HomeFilterBar";

type PreviewGraphRow = {
  keys?: [string];
  clicks?: string | number;
  impressions?: string | number;
  goal?: string | number;
};

type PreviewGraph = {
  rows?: PreviewGraphRow[];
};

type PreviewStats = {
  Total?: string | number;
  Trend?: "up" | "down" | string;
  Diff?: string | number;
};

type PreviewMainStats = {
  Clicks?: PreviewStats;
  Impressions?: PreviewStats;
  goals?: PreviewStats;
};

function safeJsonParse<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeUrlDomain(input: string) {
  const raw = (input || "").trim().toLowerCase();
  if (!raw) return "";
  const cleaned = raw.replace(/^sc-domain:/, "");
  try {
    const withProto = cleaned.startsWith("http")
      ? cleaned
      : `https://${cleaned}`;
    const url = new URL(withProto);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return (
      cleaned
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0] || raw
    );
  }
}

function compareStrings(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

// PRD §2.1 — sort order: Red+Down first … Green+Up … Gray … no-data last
const HEALTH_URGENCY: Partial<Record<string, number>> = {
  "red-down": 0,   "red-flat": 1,   "red-up": 2,
  "amber-down": 3, "amber-flat": 4, "amber-up": 5,
  "green-down": 6, "green-flat": 7, "green-up": 8,
  "gray-none": 9,
};

function getUrgencyScore(status: HealthStatusRow | undefined): number {
  if (!status?.health_color) return 10; // not yet computed → bottom
  if (status.health_color === "gray") return 9;
  const key = `${status.health_color}-${status.trend_arrow ?? "flat"}`;
  return HEALTH_URGENCY[key] ?? 10;
}
function getGreetingName(user: any) {
  return (
    user?.firstName ||
    user?.FirstName ||
    user?.name ||
    user?.Name ||
    user?.username ||
    "there"
  );
}

const HOME_SECTIONS_STORAGE_KEY = "home:sections";

function parseStoredHomeSections(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as any;
    if (!parsed || typeof parsed !== "object") return null;
    const { showActive, showOnboarding } = parsed;
    if (typeof showActive !== "boolean" || typeof showOnboarding !== "boolean")
      return null;
    return { showActive, showOnboarding };
  } catch {
    return null;
  }
}

export function HomeTemplate() {
  const router = useRouter();
  const { user } = useAuthStore();
  const greetingName = getGreetingName(user);

  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<HomePeriodValue>("3 months");
  const [selectedSignals, setSelectedSignals] = useState<
    HomeSignalFilterValue[]
  >([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  // Default to nothing selected on first render to avoid briefly showing the wrong
  // selection before localStorage is read.
  const [showActive, setShowActive] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sectionsReady, setSectionsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = parseStoredHomeSections(
      window.localStorage.getItem(HOME_SECTIONS_STORAGE_KEY)
    );
    if (stored) {
      setShowActive(stored.showActive);
      setShowOnboarding(stored.showOnboarding);
    } else {
      // Only default Active when nothing is stored.
      setShowActive(true);
      setShowOnboarding(false);
    }
    setSectionsReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sectionsReady) return;
    window.localStorage.setItem(
      HOME_SECTIONS_STORAGE_KEY,
      JSON.stringify({ showActive, showOnboarding })
    );
  }, [sectionsReady, showActive, showOnboarding]);

  const { profiles } = useBusinessProfiles();
  const { previews, isLoading: previewsLoading } = useBusinessPreviews(period);
  const { connectGoogleAccount } = useGoogleAccounts();
  const dashboardTags = useDashboardTags();

  // Drop selections for tags that disappeared (deleted elsewhere or refetched away).
  useEffect(() => {
    if (selectedTagIds.length === 0 || dashboardTags.isLoading) return;
    const knownIds = new Set(dashboardTags.tags.map(tag => tag.id));
    const stillValid = selectedTagIds.filter(id => knownIds.has(id));
    if (stillValid.length !== selectedTagIds.length) {
      setSelectedTagIds(stillValid);
    }
  }, [dashboardTags.isLoading, dashboardTags.tags, selectedTagIds]);

  const joined = useMemo(() => {
    const profileByUniqueId = new Map<
      string,
      { name: string; domain: string }
    >();
    for (const profile of profiles) {
      const uniqueId = profile.UniqueId;
      if (!uniqueId) continue;
      const domain = normalizeUrlDomain(profile.Website || "");
      profileByUniqueId.set(String(uniqueId), {
        name: profile.Name || profile.DisplayName || domain || String(uniqueId),
        domain,
      });
    }

    return previews.map((preview) => {
      const domain = normalizeUrlDomain(preview.url);
      const uniqueId = preview.businessUniqueId
        ? String(preview.businessUniqueId)
        : null;
      const match = uniqueId ? profileByUniqueId.get(uniqueId) : undefined;
      return {
        preview,
        domain: match?.domain || domain,
        name: match?.name || domain,
        uniqueId,
      };
    });
  }, [previews, profiles]);

  const selectedDashboardTags = useMemo(
    () => dashboardTags.tags.filter(tag => selectedTagIds.includes(tag.id)),
    [dashboardTags.tags, selectedTagIds]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    // Several tags act as a union: a business matches if any selected tag holds it.
    const taggedBusinessIds = selectedDashboardTags.length
      ? new Set(selectedDashboardTags.flatMap(tag => tag.businessIds))
      : null;

    return joined.filter(item => {
      if (
        taggedBusinessIds &&
        (!item.uniqueId || !taggedBusinessIds.has(item.uniqueId))
      ) {
        return false;
      }
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) || item.domain.includes(query)
      );
    });
  }, [joined, search, selectedDashboardTags]);

  const onboardingCandidates = useMemo(() => {
    return filtered.filter((item) => Boolean(item.uniqueId));
  }, [filtered]);

  const onboardingCandidateIds = useMemo(() => {
    const ids = onboardingCandidates
      .map((item) => item.uniqueId)
      .filter((x): x is string => Boolean(x));
    ids.sort();
    return ids;
  }, [onboardingCandidates]);

  const {
    data: onboardingJobsByBusinessId = {},
    isLoading: onboardingJobsLoading,
  } = useQuery<Record<string, JobDetails | null>>({
    queryKey: ["homeOnboardingJobs", onboardingCandidateIds],
    queryFn: async () => {
      if (onboardingCandidateIds.length === 0) return {};

      const results = await Promise.all(
        onboardingCandidateIds.map(async (businessId) => {
          try {
            const job = await api.get<JobDetails>(
              `/jobs/${businessId}`,
              "python"
            );
            return [businessId, job || null] as const;
          } catch (error: any) {
            if (error?.response?.status === 404) {
              return [businessId, null] as const;
            }
            return [businessId, null] as const;
          }
        })
      );

      return Object.fromEntries(results);
    },
    enabled: onboardingCandidateIds.length > 0,
    staleTime: 30 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const onboardingCards = useMemo(() => {
    return onboardingCandidates
      .filter((item) => {
        const preview = item.preview as BusinessPreviewItem;
        const businessId = item.uniqueId;
        if (!businessId) return false;

        const job = onboardingJobsByBusinessId[businessId] || null;
        const jobExists = Boolean(job?.job_id);
        const isGscConnected = preview?.isGscConnected === true;
        const isGa4Connected = preview?.isGa4Connected === true;
        const isGbpConnected = preview?.isGbpConnected === true;

        return (
          !isGscConnected || !isGa4Connected || !isGbpConnected || !jobExists
        );
      })
      .map((item) => {
        const preview = item.preview as BusinessPreviewItem;
        const businessId = item.uniqueId as string;

        const job = onboardingJobsByBusinessId[businessId] || null;
        const jobExists = Boolean(job?.job_id);

        const tasks = [
          {
            id: `${businessId}-gsc`,
            title: "Connect Google Search Console",
            description: "See how your site performs in search",
            completed: preview?.isGscConnected === true,
            action: "settings" as const,
          },
          {
            id: `${businessId}-ga4`,
            title: "Connect Google Analytics",
            description: "Tie search traffic to real business outcomes",
            completed: preview?.isGa4Connected === true,
            action: "settings" as const,
          },
          {
            id: `${businessId}-gbp`,
            title: "Connect Google Business Profile",
            description: "Improve local and map visibility",
            completed: preview?.isGbpConnected === true,
            action: "settings" as const,
          },
          {
            id: `${businessId}-job`,
            title: "Complete profile",
            description: "Tailor strategy to your unique business",
            completed: jobExists,
            action: "profile" as const,
          },
        ];

        const completedCount = tasks.filter((t) => t.completed).length;
        const percent = Math.round((completedCount / 4) * 100);

        return {
          id: businessId,
          businessName: item.name,
          progressLabel: `${percent}% complete`,
          tasks,
        };
      })
      .sort((a, b) => compareStrings(a.businessName, b.businessName));
  }, [onboardingCandidates, onboardingJobsByBusinessId]);

  const activeBusinesses = useMemo(() => {
    const active: typeof filtered = [];

    for (const item of filtered) {
      const mainStats = safeJsonParse<PreviewMainStats>(
        item.preview.mainstats,
        {}
      );
      const clicks = mainStats?.Clicks || {};
      const impressions = mainStats?.Impressions || {};

      const showConnectGoogle =
        Object.keys(clicks || {}).length === 0 ||
        Object.keys(impressions || {}).length === 0;

      if (!showConnectGoogle) {
        active.push(item);
      }
    }

    // A-Z as base order; urgency sort is applied in sortedActiveBusinesses below
    active.sort((a, b) => compareStrings(a.name, b.name));
    return active;
  }, [filtered]);

  // Collect business IDs to fetch health status in one batch call
  const activeBusinessIds = useMemo(
    () => activeBusinesses.map((b) => b.uniqueId).filter((id): id is string => !!id),
    [activeBusinesses]
  );

  const { statusMap, isLoading: healthLoading } =
    useHealthStatusBatch(activeBusinessIds);

  const filteredActiveBusinesses = useMemo(() => {
    if (selectedSignals.length === 0) return activeBusinesses;
    const wanted = new Set<HomeSignalFilterValue>(selectedSignals);
    return activeBusinesses.filter(({ uniqueId }) => {
      const status = uniqueId ? statusMap[uniqueId] : undefined;
      // A missing or gray row both read as "No Signal" to the user.
      const color = status?.health_color ?? "gray";
      return wanted.has(color as HomeSignalFilterValue);
    });
  }, [activeBusinesses, selectedSignals, statusMap]);

  const healthFilterCounts = useMemo<HomeSignalCounts>(() => {
    const counts: HomeSignalCounts = {
      red: 0,
      amber: 0,
      gray: 0,
      green: 0,
    };

    for (const business of activeBusinesses) {
      const status = business.uniqueId ? statusMap[business.uniqueId] : undefined;
      const color = status?.health_color;

      if (!color || color === "gray") {
        counts.gray += 1;
        continue;
      }

      counts[color] += 1;
    }

    return counts;
  }, [activeBusinesses, statusMap]);

  // Re-sort by PRD urgency order (Red+Down → … → Gray → no-data)
  // Ties in urgency keep the underlying A-Z order (stable sort)
  const sortedActiveBusinesses = useMemo(() => {
    return [...filteredActiveBusinesses].sort((a, b) => {
      const scoreA = getUrgencyScore(a.uniqueId ? statusMap[a.uniqueId] : undefined);
      const scoreB = getUrgencyScore(b.uniqueId ? statusMap[b.uniqueId] : undefined);
      return scoreA - scoreB;
    });
  }, [filteredActiveBusinesses, statusMap]);

  const selectedHealthFilterOption = HOME_SIGNAL_FILTERS.find((option) =>
    selectedSignals.includes(option.value)
  );
  const signalFilterEmptyDescription = selectedHealthFilterOption
    ? `No active businesses match the ${selectedHealthFilterOption.label.toLowerCase()} filter`
    : "No active businesses match the current filters";
  // Health rows back both the signal filter and the card badges, so the board is
  // only ready once they land. Without this the first batch reads as "everything
  // filtered out" and the empty state flashes in place of the skeletons.
  const activeSectionLoading = previewsLoading || healthLoading;
  const isStatusFilterEmpty =
    !activeSectionLoading &&
    activeBusinesses.length > 0 &&
    sortedActiveBusinesses.length === 0;
  const selectedTagLabel =
    selectedDashboardTags.length === 1
      ? selectedDashboardTags[0].name
      : "the selected tags";
  const activeEmptyDescription = selectedDashboardTags.length
    ? `No active businesses are assigned to ${selectedTagLabel}.`
    : search.trim()
      ? "No active businesses match your search."
      : "Connect your business from Settings or create one manually.";
  const onboardingEmptyDescription = selectedDashboardTags.length
    ? `No onboarding businesses are assigned to ${selectedTagLabel}.`
    : search.trim()
      ? "No onboarding businesses match your search."
      : "No onboarding businesses found.";

  const selectedCount = Number(showActive) + Number(showOnboarding);
  const showThreeColumnLayout = selectedCount === 2;

  const handleOpen = (uniqueId: string | null, url: string) => {
    if (uniqueId) {
      router.push(`/business/${uniqueId}/analytics`);
      return;
    }

    if (url) {
      window.open(url.startsWith("http") ? url : `https://${url}`, "_blank");
    }
  };

  return (
    <div className="bg-muted h-screen overflow-hidden">
      <div className="w-full max-w-[1224px] py-7 px-5 flex flex-col gap-5 h-full">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">
            Hi, {greetingName}
          </h1>

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <HomePeriodSelector period={period} onPeriodChange={setPeriod} />

            <div className="relative min-w-[220px] flex-1 lg:w-[320px] lg:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by business name"
                className="h-10 pl-9"
              />
            </div>

            <Button
              type="button"
              onClick={() => router.push("/create-business")}
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        <HomeFilterBar
          selectedSignals={selectedSignals}
          onSelectedSignalsChange={setSelectedSignals}
          signalCounts={healthFilterCounts}
          showActive={showActive}
          onShowActiveChange={setShowActive}
          showOnboarding={showOnboarding}
          onShowOnboardingChange={setShowOnboarding}
          selectedTagIds={selectedTagIds}
          onSelectedTagIdsChange={setSelectedTagIds}
          profiles={profiles}
          dashboardTags={dashboardTags}
        />

        {selectedCount === 0 && (
          <EmptyState
            title="No Data found"
            description="Please select Active or Onboarding businesses to show the data"
          />
        )}

        {selectedCount > 0 && showThreeColumnLayout && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-2.5 flex-1 overflow-hidden">
            {showActive && (
              <Card className="flex flex-col gap-3 p-4 border-none shadow-none xl:col-span-2 min-h-0 overflow-hidden">
                <Typography
                  variant="h4"
                  className="text-general-unofficial-foreground-alt shrink-0"
                >
                  Active Businesses
                </Typography>

                <div className="flex-1 overflow-y-auto min-h-0">
                  {activeSectionLoading ? (
                    <div className="grid grid-cols-2 gap-2.5 overflow-y-auto flex-1">
                      {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="overflow-hidden">
                          <div className="px-3 py-2 border-b border-border">
                            <Skeleton className="h-4 w-40" />
                          </div>
                          <div className="px-3 py-2">
                            <Skeleton className="h-[115px] w-full" />
                          </div>
                          <CardContent className="pt-0 pb-3 px-3">
                            <div className="flex gap-2">
                              <Skeleton className="h-8 flex-1" />
                              <Skeleton className="h-8 flex-1" />
                              <Skeleton className="h-8 flex-1" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : activeBusinesses.length === 0 ? (
                    <EmptyState
                      title="No active businesses"
                      cardClassName="bg-white h-full flex items-center justify-center"
                      description={activeEmptyDescription}
                      buttons={selectedDashboardTags.length || search.trim() ? undefined : [
                          {
                            label: "Go to Settings",
                            href: "/settings",
                            variant: "outline",
                            size: "lg",
                          },
                          {
                            label: "Create Manually",
                            href: "/create-business",
                            variant: "outline",
                            size: "lg",
                          },
                        ]}
                      className="h-full"
                    />
                  ) : isStatusFilterEmpty ? (
                    <EmptyState
                      title="No matching clients"
                      description={signalFilterEmptyDescription}
                      cardClassName="bg-white h-full flex items-center justify-center"
                      className="h-full"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 overflow-y-auto flex-1 auto-rows-max">
                      {sortedActiveBusinesses.map(
                        ({ preview, name, domain, uniqueId }) => {
                          const mainStats = safeJsonParse<PreviewMainStats>(
                            preview.mainstats,
                            {}
                          );
                          const graph = safeJsonParse<PreviewGraph>(
                            preview.graph,
                            {}
                          );

                          return (
                            <BusinessPreviewCard
                              key={uniqueId ?? domain}
                              name={name}
                              url={preview.url}
                              graph={graph}
                              impressions={mainStats?.Impressions}
                              clicks={mainStats?.Clicks}
                              goals={mainStats?.goals}
                              isGa4Connected={preview.isGa4Connected}
                              period={period}
                              healthStatus={uniqueId ? statusMap[uniqueId] : undefined}
                              onConnectGoogle={connectGoogleAccount}
                              onClick={() => handleOpen(uniqueId, preview.url)}
                            />
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {showOnboarding && (
              <Card className="flex flex-col gap-3 p-4 border-none shadow-none bg-general-primary-foreground rounded-(--rounded-12,12px) min-h-0 overflow-hidden">
                <Typography
                  variant="h4"
                  className="text-general-unofficial-foreground-alt shrink-0"
                >
                  Onboarding
                </Typography>

                <div className="flex-1 overflow-y-auto min-h-0">
                  {previewsLoading || onboardingJobsLoading ? (
                    <div className="flex flex-col gap-2.5 overflow-y-auto flex-1">
                      {[1, 2].map((i) => (
                        <Card key={i} className="p-3 border-border">
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-6 w-24" />
                          </div>
                          <div className="mt-3 flex flex-col gap-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : onboardingCards.length === 0 ? (
                    <EmptyState
                      title="No onboarding businesses"
                      description={onboardingEmptyDescription}
                      cardClassName="bg-general-primary-foreground h-full flex items-center justify-center"
                      className="h-full"
                    />
                  ) : (
                    <div className="flex flex-col gap-2.5 overflow-y-auto flex-1">
                      {onboardingCards.map((card) => (
                        <OnboardingCard
                          key={card.id}
                          businessId={card.id}
                          businessName={card.businessName}
                          progressLabel={card.progressLabel}
                          tasks={card.tasks}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {selectedCount > 0 && !showThreeColumnLayout && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-5">
            {showActive && (
              <Card
                className={cn(
                  "flex flex-col gap-3 p-4 border-none shadow-none overflow-hidden"
                )}
              >
                <Typography
                  variant="h4"
                  className="text-general-unofficial-foreground-alt"
                >
                  Active Businesses
                </Typography>

                <div className="flex-1 overflow-y-auto min-h-0">
                  {activeSectionLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="overflow-hidden">
                          <div className="px-3 py-2 border-b border-border">
                            <Skeleton className="h-4 w-40" />
                          </div>
                          <div className="px-3 py-2">
                            <Skeleton className="h-[115px] w-full" />
                          </div>
                          <CardContent className="pt-0 pb-3 px-3">
                            <div className="flex gap-2">
                              <Skeleton className="h-8 flex-1" />
                              <Skeleton className="h-8 flex-1" />
                              <Skeleton className="h-8 flex-1" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : activeBusinesses.length === 0 ? (
                    <EmptyState
                      title="No active businesses"
                      description={activeEmptyDescription}
                      cardClassName="bg-white"
                      buttons={selectedDashboardTags.length || search.trim() ? undefined : [
                          {
                            label: "Go to Settings",
                            href: "/settings",
                            variant: "outline",
                            size: "lg",
                          },
                          {
                            label: "Create Manually",
                            href: "/create-business",
                            variant: "outline",
                            size: "lg",
                          },
                        ]}
                      className="h-full"
                    />
                  ) : isStatusFilterEmpty ? (
                    <EmptyState
                      title="No matching clients"
                      description={signalFilterEmptyDescription}
                      cardClassName="bg-white"
                      className="h-full"
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                      {sortedActiveBusinesses.map(
                        ({ preview, name, domain, uniqueId }) => {
                          const mainStats = safeJsonParse<PreviewMainStats>(
                            preview.mainstats,
                            {}
                          );
                          const graph = safeJsonParse<PreviewGraph>(
                            preview.graph,
                            {}
                          );

                          return (
                            <BusinessPreviewCard
                              key={uniqueId ?? domain}
                              name={name}
                              url={preview.url}
                              graph={graph}
                              impressions={mainStats?.Impressions}
                              clicks={mainStats?.Clicks}
                              goals={mainStats?.goals}
                              isGa4Connected={preview.isGa4Connected}
                              period={period}
                              healthStatus={uniqueId ? statusMap[uniqueId] : undefined}
                              onConnectGoogle={connectGoogleAccount}
                              onClick={() => handleOpen(uniqueId, preview.url)}
                            />
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {showOnboarding && (
              <Card
                className={cn(
                  "flex flex-col gap-3 p-4 border-none shadow-none bg-general-primary-foreground rounded-(--rounded-12,12px) overflow-hidden"
                )}
              >
                <Typography
                  variant="h4"
                  className="text-general-unofficial-foreground-alt"
                >
                  Onboarding
                </Typography>

                <div className="flex-1 overflow-y-auto min-h-0">
                  {previewsLoading || onboardingJobsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="p-3 border-border">
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-6 w-24" />
                          </div>
                          <div className="mt-3 flex flex-col gap-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : onboardingCards.length === 0 ? (
                    <EmptyState
                      title="No onboarding businesses"
                      description={onboardingEmptyDescription}
                      cardClassName="bg-general-primary-foreground"
                      className="h-full"
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                      {onboardingCards.map((card) => (
                        <OnboardingCard
                          key={card.id}
                          businessId={card.id}
                          businessName={card.businessName}
                          progressLabel={card.progressLabel}
                          tasks={card.tasks}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
