"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/molecules/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  monitoringErrorMessage,
  monitoringErrorStatus,
  useMonitoringScreen,
  type MonitoringRange,
} from "@/hooks/use-monitoring-screen";
import { MonitoringRangePicker } from "@/components/molecules/monitoring/MonitoringRangePicker";
import { MonitoringTopCard } from "@/components/molecules/monitoring/MonitoringTopCard";
import { MonitoringTimelineCard } from "@/components/molecules/monitoring/MonitoringTimelineCard";
import { MonitoringEventsCard } from "@/components/molecules/monitoring/MonitoringEventsCard";
import { MonitoringEventPanel } from "@/components/molecules/monitoring/MonitoringEventPanel";

interface MonitoringOverviewTemplateProps {
  businessId: string;
  businessName: string;
  website?: string | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PRESET_PATTERN = /^[a-z0-9_]{1,20}$/;

/** The range lives in the URL so a link reopens the same dates. */
function rangeFromParams(params: URLSearchParams): MonitoringRange {
  const range = params.get("range");
  if (range === "custom") {
    const start = params.get("start");
    const end = params.get("end");
    return start && end && DATE_PATTERN.test(start) && DATE_PATTERN.test(end) ? { start, end } : null;
  }
  return range && PRESET_PATTERN.test(range) ? { preset: range } : null;
}

export function MonitoringOverviewTemplate({
  businessId,
  businessName,
  website,
}: MonitoringOverviewTemplateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range = useMemo(() => rangeFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const cardId = searchParams.get("card");

  const query = useMonitoringScreen(businessId, range);
  const screen = query.data ?? null;
  const loading = query.isLoading;
  const pendingRange = query.isFetching && query.isPlaceholderData;
  const retrying = query.isFetching && !query.isPlaceholderData;

  const updateParams = useCallback(
    (edit: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      edit(params);
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const changeRange = useCallback(
    (next: MonitoringRange) =>
      updateParams((params) => {
        params.delete("range");
        params.delete("start");
        params.delete("end");
        params.delete("card");
        if (!next) return;
        if ("preset" in next) {
          params.set("range", next.preset);
        } else {
          params.set("range", "custom");
          params.set("start", next.start);
          params.set("end", next.end);
        }
      }),
    [updateParams]
  );

  const openCard = useCallback(
    (id: string) => updateParams((params) => params.set("card", id)),
    [updateParams]
  );
  const closeCard = useCallback(() => updateParams((params) => params.delete("card")), [updateParams]);

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName, href: `/business/${businessId}/analytics` },
      { label: "Overview" },
    ],
    [businessId, businessName]
  );

  const screenError = query.isError && !screen;
  const rangeError = screenError && monitoringErrorStatus(query.error) === 400;

  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        breadcrumbs={breadcrumbs}
        showAskMassic={false}
        actions={
          <MonitoringRangePicker
            model={screen?.range ?? null}
            value={range}
            onChange={changeRange}
            pending={pendingRange}
            disabled={loading || screenError}
          />
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {screenError ? (
          <div className="flex flex-col items-start gap-3 px-8 pt-6">
            <p className="text-sm leading-[1.5] tracking-[0.07px] text-general-muted-foreground">
              {monitoringErrorMessage(query.error)}
            </p>
            {rangeError ? (
              <Button variant="outline" size="sm" onClick={() => changeRange(null)}>
                Use the default dates
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={refetch} disabled={query.isFetching}>
                <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} strokeWidth={1.5} />
                Try again
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "flex w-full max-w-[1224px] flex-col gap-5 px-8 pt-6 pb-28 transition-opacity",
              pendingRange && "opacity-60"
            )}
            aria-busy={query.isFetching}
          >
            <MonitoringTopCard
              businessName={businessName}
              website={website}
              top={screen?.top ?? null}
              loading={loading}
              onRetry={refetch}
              retrying={retrying}
            />
            <MonitoringTimelineCard
              chart={screen?.chart ?? null}
              range={screen?.range ?? null}
              sources={screen?.sources ?? null}
              loading={loading}
              onRetry={refetch}
              retrying={retrying}
              onOpenCard={openCard}
            />
            <MonitoringEventsCard
              key={JSON.stringify(range)}
              list={screen?.list ?? null}
              metrics={screen?.metrics ?? null}
              loading={loading}
              onRetry={refetch}
              retrying={retrying}
              onOpenCard={openCard}
            />
          </div>
        )}
      </div>

      <MonitoringEventPanel
        businessId={businessId}
        cardId={screen ? cardId : null}
        range={range}
        website={website}
        onClose={closeCard}
      />
    </div>
  );
}
