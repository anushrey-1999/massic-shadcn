"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminAgency, getAdminIntelligence } from "../api/admin-api";
import { AdminBenchmarkCard } from "../components/admin-benchmark-card";
import { AdminBusinessTable } from "../businesses/admin-business-table";
import { AdminKpiGrid } from "../components/admin-kpi-card";
import { AdminPageHeader } from "../components/admin-page-header";
import { AdminRangeSelect } from "../components/admin-range-select";
import { AdminErrorState, AdminPageLoading } from "../components/admin-states";
import { useAdminQueryState } from "../hooks/use-admin-query-state";

export function AdminAgencySnapshot({ id }: { id: string }) {
  const { range, setQuery } = useAdminQueryState();
  const query = useQuery({
    queryKey: ["admin", "agency", id, range],
    queryFn: () => getAdminAgency(id, { range }),
    staleTime: 60_000,
  });
  const benchmark = useQuery({
    queryKey: ["admin", "intelligence", "agency", id, range],
    queryFn: () =>
      getAdminIntelligence({
        agencyId: id,
        range,
        metric: "ctr",
        dimension: "industry",
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
  const data = query.data.data;
  const [network, growth, , subscription] = data.modules;
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1500px]">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="mb-3 -ml-2 transition-colors hover:text-general-primary"
      >
        <Link href="/admin/businesses">
          <ArrowLeft />
          Businesses
        </Link>
      </Button>
      <AdminPageHeader
        title={data.agency.name}
        description={`${data.businesses.length} businesses · agency-scoped network view with read-only access.`}
        freshnessDate={network?.meta.freshnessDate}
        sourceFreshness={network?.meta.sourceFreshness}
        cacheState={network?.meta.cacheState}
        actions={
          <AdminRangeSelect
            value={range}
            onChange={(value) => setQuery({ range: value })}
            disabled={query.isFetching}
          />
        }
      />
      <section aria-labelledby="agency-performance">
        <h2 id="agency-performance" className="mb-3 text-sm font-medium">
          Performance
        </h2>
        <AdminKpiGrid
          kpis={[
            ...(network?.kpis.slice(0, 4) || []),
            ...(subscription?.kpis.slice(0, 2) || []),
          ]}
        />
      </section>
      {benchmark.data?.data && (
        <div className="mt-4">
          <AdminBenchmarkCard
            title="Agency CTR compared with the network"
            metric="ctr"
            target={benchmark.data.data.target.value}
            median={benchmark.data.data.cohort.median}
            rank={benchmark.data.data.target.percentileRank}
            cohortCount={benchmark.data.data.cohort.count}
            cohort={benchmark.data.data.target.cohort}
            entityKind="agency"
            period={network?.meta.range}
          />
        </div>
      )}
      <section className="mt-6" aria-labelledby="agency-health">
        <h2 id="agency-health" className="mb-3 text-sm font-medium">
          Health signals
        </h2>
        <AdminKpiGrid kpis={growth?.kpis.slice(0, 4) || []} />
      </section>
      <section className="mt-6" aria-labelledby="agency-businesses">
        <h2 id="agency-businesses" className="mb-3 text-sm font-medium">
          Businesses
        </h2>
        <AdminBusinessTable rows={data.businesses} />
      </section>
    </div>
  );
}
