"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, DatabaseZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminOverview } from "../api/admin-api";
import { AdminBusinessTable } from "../businesses/admin-business-table";
import { AdminFilterBar } from "../components/admin-filter-bar";
import { AdminKpiGrid } from "../components/admin-kpi-card";
import { AdminPageHeader } from "../components/admin-page-header";
import { AdminRangeSelect } from "../components/admin-range-select";
import { AdminErrorState, AdminPageLoading } from "../components/admin-states";
import { useAdminQueryState } from "../hooks/use-admin-query-state";

export function AdminOverview() {
  const { range, agencyId, industry, plan, status, setQuery } =
    useAdminQueryState();
  const query = useQuery({
    queryKey: ["admin", "overview", range, agencyId, industry, plan, status],
    queryFn: () =>
      getAdminOverview({ range, agencyId, industry, plan, status }),
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
  const data = query.data.data;
  const headlineKpis = [
    ...data.platform.kpis.slice(0, 2),
    ...data.network.kpis.slice(0, 2),
    ...data.subscription.kpis.slice(0, 2),
  ];
  const statuses = data.growth.kpis.slice(0, 4);
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1500px]">
      <AdminPageHeader
        title="Network overview"
        description="See customer health, platform coverage, and commercial performance across Massic."
        freshnessDate={data.meta.freshnessDate}
        sourceFreshness={data.meta.sourceFreshness}
        cacheState={data.meta.cacheState}
        actions={
          <AdminRangeSelect
            value={range}
            onChange={(value) => setQuery({ range: value })}
            disabled={query.isFetching}
          />
        }
      />
      <AdminFilterBar />
      {!data.meta.freshnessDate && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <DatabaseZap className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">
              Analytics sources are not materialized yet
            </p>
            <p className="mt-1 text-amber-900/80">
              Live totals will appear after the existing GSC and GA4 continuous
              aggregate policies complete.
            </p>
          </div>
        </div>
      )}
      <section aria-labelledby="executive-kpis">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="executive-kpis" className="text-sm font-medium">
              Executive snapshot
            </h2>
            <p className="mt-1 text-xs text-general-muted-foreground">
              Current period compared with the immediately preceding period.
            </p>
          </div>
        </div>
        <AdminKpiGrid kpis={headlineKpis} />
      </section>
      <section className="mt-6" aria-labelledby="health-signals">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="health-signals" className="text-sm font-medium">
              Business health
            </h2>
            <p className="mt-1 text-xs text-general-muted-foreground">
              Latest signal for each business in the selected period.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/admin/growth?range=${range}`}>
              View growth <ArrowRight />
            </Link>
          </Button>
        </div>
        <AdminKpiGrid kpis={statuses} />
      </section>
      <section className="mt-6" aria-labelledby="businesses-preview">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="businesses-preview" className="text-sm font-medium">
              Businesses
            </h2>
            <p className="mt-1 text-xs text-general-muted-foreground">
              Open a read-only snapshot to investigate a customer.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/businesses">
              View all <ArrowRight />
            </Link>
          </Button>
        </div>
        <AdminBusinessTable rows={data.businesses.rows} />
      </section>
    </div>
  );
}
