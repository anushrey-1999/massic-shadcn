"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Check, ExternalLink, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminBusiness, getAdminIntelligence } from "../api/admin-api";
import { AdminBusinessFavicon } from "../components/admin-business-favicon";
import { AdminBenchmarkCard } from "../components/admin-benchmark-card";
import { AdminKpiGrid } from "../components/admin-kpi-card";
import { AdminPageHeader } from "../components/admin-page-header";
import { AdminRangeSelect } from "../components/admin-range-select";
import { AdminErrorState, AdminPageLoading } from "../components/admin-states";
import { AdminStatusBadge } from "../components/status-badge";
import { useAdminQueryState } from "../hooks/use-admin-query-state";
import type { AdminKpi } from "../types";

function availableKpi(
  key: string,
  label: string,
  value: unknown,
  unavailableReason = "This source is not available for the selected range.",
): AdminKpi {
  return {
    key,
    label,
    value: value === null || value === undefined ? null : Number(value),
    previous: null,
    changePct: null,
    trend: [],
    availability: {
      state:
        value === null || value === undefined ? "unavailable" : "available",
      reason: value === null || value === undefined ? unavailableReason : null,
    },
  };
}

function ConnectionRow({
  label,
  connected,
}: {
  label: string;
  connected: boolean;
}) {
  return (
    <div className="flex h-10 items-center justify-between border-b border-general-border last:border-0">
      <span className="text-sm">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-xs text-general-muted-foreground">
        {connected ? (
          <Check className="size-4 text-emerald-700" />
        ) : (
          <Minus className="size-4" />
        )}
        {connected ? "Connected" : "Not connected"}
      </span>
    </div>
  );
}

export function AdminBusinessSnapshot({ id }: { id: string }) {
  const { range, setQuery } = useAdminQueryState();
  const query = useQuery({
    queryKey: ["admin", "business", id, range],
    queryFn: () => getAdminBusiness(id, { range }),
    staleTime: 60_000,
  });
  const benchmark = useQuery({
    queryKey: ["admin", "intelligence", "business", id, range],
    queryFn: () =>
      getAdminIntelligence({
        businessId: id,
        metric: "ctr",
        dimension: "industry",
        range,
      }),
    staleTime: 60_000,
  });
  if (query.isLoading) return <AdminPageLoading />;
  if (query.isError || !query.data?.data)
    return (
      <AdminErrorState
        message={query.error?.message}
        onRetry={() => query.refetch()}
        pending={query.isFetching}
      />
    );
  const { dimension, analytics } = query.data.data;
  const kpis = [
    ...analytics.kpis,
    availableKpi(
      "mrr",
      "MRR",
      null,
      "Stripe billing is not connected to the live business snapshot yet.",
    ),
  ];
  const clickTrend =
    analytics.kpis.find((kpi) => kpi.key === "clicks")?.trend || [];
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1500px]">
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
        <Link href="/admin/businesses">
          <ArrowLeft />
          Businesses
        </Link>
      </Button>
      <AdminPageHeader
        title={dimension.business_name}
        description={`${dimension.agency_name || "Unknown agency"} · ${dimension.website || "No website"}`}
        freshnessDate={analytics.meta.freshnessDate}
        sourceFreshness={analytics.meta.sourceFreshness}
        cacheState={analytics.meta.cacheState}
        icon={
          <AdminBusinessFavicon
            siteUrl={dimension.website}
            className="size-9"
          />
        }
        actions={
          <>
            <AdminRangeSelect
              value={range}
              onChange={(value) => setQuery({ range: value })}
              disabled={query.isFetching}
            />
            <AdminStatusBadge
              status={analytics.meta.entityStatus || "no_signal"}
            />
            {dimension.website && (
              <Button variant="outline" className="h-9" asChild>
                <a
                  href={
                    dimension.website.startsWith("http")
                      ? dimension.website
                      : `https://${dimension.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Website <ExternalLink />
                </a>
              </Button>
            )}
          </>
        }
      />
      <AdminKpiGrid kpis={kpis} />
      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section
          className="admin-panel admin-panel-hover rounded-lg border p-4"
          aria-labelledby="business-trend"
        >
          <div className="mb-4">
            <h2 id="business-trend" className="text-sm font-medium">
              Clicks over selected range
            </h2>
            <p className="mt-1 text-xs text-general-muted-foreground">
              {analytics.meta.range.currentStart} to{" "}
              {analytics.meta.range.currentEnd}, from the existing GSC
              continuous aggregate.
            </p>
          </div>
          <div className="h-[280px] w-full">
            {clickTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={clickTrend}>
                  <defs>
                    <linearGradient
                      id="adminClicks"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--general-primary-gradient-to)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--general-primary)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--general-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 11,
                      fill: "var(--general-muted-foreground)",
                    }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: "var(--general-muted-foreground)",
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      borderColor: "var(--general-border)",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Clicks"
                    stroke="var(--general-primary)"
                    strokeWidth={2}
                    fill="url(#adminClicks)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-general-muted-foreground">
                No clicks in this range.
              </div>
            )}
          </div>
        </section>
        <section
          className="admin-panel admin-panel-hover rounded-lg border p-4"
          aria-labelledby="connections"
        >
          <h2 id="connections" className="text-sm font-medium">
            Connections
          </h2>
          <p className="mt-1 mb-3 text-xs text-general-muted-foreground">
            Current integration coverage.
          </p>
          <ConnectionRow
            label="Google Search Console"
            connected={dimension.connected_gsc}
          />
          <ConnectionRow
            label="Google Analytics 4"
            connected={dimension.connected_ga4}
          />
          <ConnectionRow
            label="Google Business Profile"
            connected={dimension.connected_gbp}
          />
          <ConnectionRow
            label={`${dimension.cms === "Unknown" ? "CMS" : dimension.cms} publishing`}
            connected={dimension.connected_cms}
          />
        </section>
      </div>
      {benchmark.data?.data && (
        <div className="mt-4">
          <AdminBenchmarkCard
            title="Industry benchmark"
            metric="ctr"
            target={benchmark.data.data.target.value}
            median={benchmark.data.data.cohort.median}
            rank={benchmark.data.data.target.percentileRank}
            cohortCount={benchmark.data.data.cohort.count}
            cohort={benchmark.data.data.target.cohort}
          />
        </div>
      )}
    </div>
  );
}
