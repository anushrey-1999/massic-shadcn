"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  downloadAdminExport,
  getAdminIndustrySyncStatus,
  getAdminModule,
  startAdminIndustrySync,
} from "../api/admin-api";
import { AdminBreakdownTable } from "../components/admin-breakdown-table";
import { AdminKpiGrid } from "../components/admin-kpi-card";
import { AdminFilterBar } from "../components/admin-filter-bar";
import { AdminPageHeader } from "../components/admin-page-header";
import { AdminRangeSelect } from "../components/admin-range-select";
import { AdminErrorState, AdminPageLoading } from "../components/admin-states";
import { useAdminQueryState } from "../hooks/use-admin-query-state";
import type { AdminModuleKey } from "../types";
import { AdminApiCostView } from "./admin-api-cost-view";
import { AdminSubscriptionView } from "./admin-subscription-view";

const descriptions: Record<AdminModuleKey, string> = {
  "network-performance":
    "Search and organic performance across every active Massic business.",
  growth: "Business health signals and product activity across the network.",
  "api-cost":
    "Lifetime OpenAI and Anthropic usage recorded across Massic businesses.",
  industry:
    "Compare performance by Infer-enriched industry, with business profile category as fallback.",
  "category-insights":
    "Pivot network outcomes by agency, CMS, location, plan, category, or tenure.",
  "platform-totals":
    "Current businesses, agencies, integrations, and publishing coverage.",
  subscription:
    "Recurring revenue and subscription health from persisted Stripe-backed records.",
};

const groups = [
  { value: "agency", label: "Agency" },
  { value: "industry", label: "Industry" },
  { value: "cms", label: "CMS" },
  { value: "state", label: "State" },
  { value: "country", label: "Country" },
  { value: "category", label: "Category" },
  { value: "plan", label: "Plan" },
  { value: "tenure", label: "Tenure" },
];

export function AdminModuleView({ module }: { module: AdminModuleKey }) {
  const queryClient = useQueryClient();
  const [requestedSyncId, setRequestedSyncId] = useState<string | null>(null);
  const { range, groupBy, metric, agencyId, industry, plan, status, setQuery } =
    useAdminQueryState(module === "subscription" ? "lifetime" : "last_28_days");
  const moduleQuery =
    module === "api-cost"
      ? ({ range: "lifetime" } as const)
      : { range, groupBy, metric, agencyId, industry, plan, status };
  const query = useQuery({
    queryKey: ["admin", "module", module, moduleQuery],
    queryFn: () => getAdminModule(module, moduleQuery),
    staleTime: 60_000,
  });
  const exportMutation = useMutation({
    mutationFn: () =>
      downloadAdminExport(module, {
        range,
        groupBy,
        metric,
        agencyId,
        industry,
        plan,
        status,
      }),
    onSuccess: () => toast.success("CSV downloaded"),
    onError: (error: Error) => toast.error(error.message || "Export failed"),
  });
  const industrySyncStatus = useQuery({
    queryKey: ["admin", "industry-sync"],
    queryFn: getAdminIndustrySyncStatus,
    enabled: module === "industry",
    staleTime: 5_000,
    refetchInterval: (statusQuery) => {
      const status = statusQuery.state.data?.data?.run?.status;
      return status === "queued" || status === "running" ? 3_000 : false;
    },
  });
  const industrySyncMutation = useMutation({
    mutationFn: startAdminIndustrySync,
    onSuccess: (response) => {
      const result = response.data;
      setRequestedSyncId(result.run.id);
      queryClient.setQueryData(["admin", "industry-sync"], {
        success: true,
        data: { run: result.run },
      });
      toast.info(
        result.alreadyRunning
          ? "Industry sync is already running"
          : "Industry sync started",
      );
    },
    onError: (error: Error) =>
      toast.error(error.message || "Industry sync could not start"),
  });
  const syncRun = industrySyncStatus.data?.data?.run;
  const syncActive =
    industrySyncMutation.isPending ||
    syncRun?.status === "queued" ||
    syncRun?.status === "running";

  useEffect(() => {
    if (!requestedSyncId || syncRun?.id !== requestedSyncId) return;
    if (!["completed", "partial", "failed"].includes(syncRun.status)) return;
    if (syncRun.status === "completed") {
      toast.success(`Industries synced for ${syncRun.resolvedCount} businesses`);
    } else if (syncRun.status === "partial") {
      toast.warning(
        `Industry sync completed with ${syncRun.errorCount} error${syncRun.errorCount === 1 ? "" : "s"}`,
      );
    } else {
      toast.error(syncRun.errorDetails?.[0]?.message || "Industry sync failed");
    }
    setRequestedSyncId(null);
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
  }, [queryClient, requestedSyncId, syncRun]);

  if (query.isLoading) return <AdminPageLoading />;
  if (query.isError || !query.data?.data)
    return (
      <AdminErrorState
        message={query.error?.message}
        onRetry={() => query.refetch()}
        pending={query.isFetching}
      />
    );
  const data = query.data.data;
  if (module === "subscription") {
    return (
      <AdminSubscriptionView
        data={data}
        range={range}
        agencyId={agencyId}
        plan={plan}
        fetching={query.isFetching && !query.isLoading}
        exporting={exportMutation.isPending}
        onExport={() => exportMutation.mutate()}
        setQuery={setQuery}
      />
    );
  }
  const hidesBreakdown = module === "platform-totals";
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1500px]">
      <AdminPageHeader
        title={data.meta.label}
        description={descriptions[module]}
        freshnessDate={data.meta.freshnessDate}
        sourceFreshness={data.meta.sourceFreshness}
        cacheState={data.meta.cacheState}
        actions={module === "api-cost" ? undefined : (
          <>
            {module === "industry" && (
              <Button
                variant="outline"
                className="h-9"
                disabled={syncActive}
                onClick={() => industrySyncMutation.mutate()}
              >
                {syncActive ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RefreshCw />
                )}
                {syncActive ? "Syncing…" : "Sync industries"}
              </Button>
            )}
            <AdminRangeSelect
              value={range}
              onChange={(value) => setQuery({ range: value })}
              disabled={query.isFetching}
            />
            {!hidesBreakdown && (
              <Button
                variant="outline"
                className="h-9"
                disabled={
                  exportMutation.isPending || !data.breakdown.rows.length
                }
                onClick={() => exportMutation.mutate()}
              >
                {exportMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Download />
                )}
                {exportMutation.isPending ? "Exporting…" : "Export CSV"}
              </Button>
            )}
          </>
        )}
      />

      {module === "industry" && syncRun && (
        <div
          className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-general-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full ${
                syncActive
                  ? "animate-pulse bg-amber-500"
                  : syncRun.status === "failed"
                    ? "bg-red-500"
                    : "bg-emerald-500"
              }`}
              aria-hidden="true"
            />
            {syncActive
              ? "Refreshing industries from Infer"
              : syncRun.status === "failed"
                ? "Last industry sync failed"
                : `${syncRun.resolvedCount} industries resolved`}
          </span>
          {!syncActive && syncRun.completedAt && (
            <span>
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(syncRun.completedAt))}
            </span>
          )}
        </div>
      )}

      {module === "api-cost" ? (
        <AdminApiCostView
          data={data}
          onRetry={() => query.refetch()}
          pending={query.isFetching}
        />
      ) : (
        <>
          <AdminFilterBar />

          <AdminKpiGrid kpis={data.kpis} />

          {!hidesBreakdown && (
            <section className="mt-6" aria-labelledby="breakdown-title">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="breakdown-title" className="text-sm font-medium">
                    Breakdown
                  </h2>
                  <p className="mt-1 text-xs text-general-muted-foreground">
                    Current and previous periods use the same filters.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={data.meta.metric}
                    onValueChange={(value) => setQuery({ metric: value })}
                  >
                    <SelectTrigger className="h-9 min-w-[160px] rounded-md bg-white/90 shadow-xs transition-colors hover:border-general-primary/35">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {data.kpis.map((kpi) => (
                        <SelectItem key={kpi.key} value={kpi.key}>
                          {kpi.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={data.meta.groupBy}
                    onValueChange={(value) => setQuery({ groupBy: value })}
                    disabled={module === "industry"}
                  >
                    <SelectTrigger className="h-9 min-w-[140px] rounded-md bg-white/90 shadow-xs transition-colors hover:border-general-primary/35">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {groups.map((group) => (
                        <SelectItem key={group.value} value={group.value}>
                          {group.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <AdminBreakdownTable
                rows={data.breakdown.rows}
                metric={data.meta.metric}
              />
            </section>
          )}
        </>
      )}
      {query.isFetching && !query.isLoading && (
        <div
          className="admin-panel fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-general-muted-foreground"
          role="status"
        >
          <Loader2 className="size-3.5 animate-spin text-general-primary" />
          Refreshing…
        </div>
      )}
    </div>
  );
}
