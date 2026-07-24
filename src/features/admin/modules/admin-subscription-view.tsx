"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Filter,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminFilters } from "../api/admin-api";
import { AdminKpiGrid, formatAdminValue } from "../components/admin-kpi-card";
import { AdminPageHeader } from "../components/admin-page-header";
import { AdminRangeSelect } from "../components/admin-range-select";
import { AdminEmptyState } from "../components/admin-states";
import type { AdminModuleData, AdminRangeKey } from "../types";

function BillingFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value?: string) => void;
}) {
  return (
    <Select
      value={value || "__all"}
      onValueChange={(next) => onChange(next === "__all" ? undefined : next)}
    >
      <SelectTrigger className="h-8 min-w-[140px] rounded-md bg-white/85 text-xs transition-colors hover:border-general-primary/35">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">All {label.toLowerCase()}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RecurringRevenueTable({ data }: { data: AdminModuleData }) {
  const rows = data.subscription?.recurringBreakdown || [];
  if (!rows.length)
    return (
      <div className="admin-panel rounded-lg border">
        <AdminEmptyState
          title="No recurring Stripe revenue"
          description="Apply the Stripe backfill or adjust the selected filters."
        />
      </div>
    );
  return (
    <div className="admin-panel w-full overflow-hidden rounded-lg border">
      <div className="max-w-full overflow-x-auto" role="region" aria-label="Recurring revenue breakdown" tabIndex={0}>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-general-primary/5 text-general-muted-foreground">
            <tr className="h-9 border-b border-general-border">
              <th className="px-3 text-left font-medium">Plan</th>
              <th className="px-3 text-left font-medium">Level</th>
              <th className="px-3 text-right font-medium">Active</th>
              <th className="px-3 text-right font-medium">MRR</th>
              <th className="px-3 text-right font-medium">ARR</th>
              <th className="px-3 text-right font-medium">New MRR</th>
              <th className="px-3 text-right font-medium">Retained MRR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.scope}-${row.planKey}`} className="h-11 border-b border-general-border last:border-0 hover:bg-general-primary/4">
                <td className="px-3 font-medium">{row.planLabel}</td>
                <td className="px-3">
                  <Badge variant="outline" className="rounded font-normal capitalize">
                    {row.scope}
                  </Badge>
                </td>
                <td className="px-3 text-right tabular-nums">{row.activeCount}</td>
                <td className="px-3 text-right tabular-nums">{formatAdminValue("mrr", row.mrr)}</td>
                <td className="px-3 text-right tabular-nums">{formatAdminValue("arr", row.arr)}</td>
                <td className="px-3 text-right tabular-nums">{formatAdminValue("new_mrr", row.newMrr)}</td>
                <td className="px-3 text-right tabular-nums">{formatAdminValue("retained_mrr", row.retainedMrr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExecutionCreditsTable({ data }: { data: AdminModuleData }) {
  const rows = data.subscription?.executionCredits.agencies || [];
  if (!rows.length)
    return (
      <div className="admin-panel rounded-lg border">
        <AdminEmptyState
          title="No Execution Credit purchases"
          description="No paid credit purchases were found in this period."
        />
      </div>
    );
  return (
    <div className="admin-panel w-full overflow-hidden rounded-lg border">
      <div className="max-w-full overflow-x-auto" role="region" aria-label="Execution Credit revenue by agency" tabIndex={0}>
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-general-primary/5 text-general-muted-foreground">
            <tr className="h-9 border-b border-general-border">
              <th className="px-3 text-left font-medium">Agency</th>
              <th className="px-3 text-right font-medium">Purchases</th>
              <th className="px-3 text-right font-medium">Credits</th>
              <th className="px-3 text-right font-medium">Refunds</th>
              <th className="px-3 text-right font-medium">Net revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.agencyId || row.agencyName} className="h-11 border-b border-general-border last:border-0 hover:bg-general-primary/4">
                <td className="max-w-[300px] truncate px-3 font-medium">{row.agencyName}</td>
                <td className="px-3 text-right tabular-nums">{row.purchases}</td>
                <td className="px-3 text-right tabular-nums">{row.credits.toLocaleString()}</td>
                <td className="px-3 text-right tabular-nums text-general-muted-foreground">
                  {formatAdminValue("execution_credit_revenue", row.refunded)}
                </td>
                <td className="px-3 text-right font-medium tabular-nums">
                  {formatAdminValue("execution_credit_revenue", row.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminSubscriptionView({
  data,
  range,
  agencyId,
  plan,
  fetching,
  exporting,
  onExport,
  setQuery,
}: {
  data: AdminModuleData;
  range: AdminRangeKey;
  agencyId?: string;
  plan?: string;
  fetching: boolean;
  exporting: boolean;
  onExport: () => void;
  setQuery: (updates: Record<string, string | null | undefined>) => void;
}) {
  const filters = useQuery({ queryKey: ["admin", "filters"], queryFn: getAdminFilters, staleTime: 60_000 });
  const subscription = data.subscription;
  const coverage = subscription?.coverage;
  const hasFilters = Boolean(agencyId || plan);
  const planOptions = [
    { value: "starter", label: "Starter" },
    { value: "core", label: "Core" },
    { value: "growth", label: "Growth" },
    { value: "massic_opportunities", label: "Massic Opportunities" },
  ];
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1500px]">
      <AdminPageHeader
        title="Subscription"
        description="Stripe recurring revenue, agency products, and one-time Execution Credit sales."
        freshnessDate={data.meta.freshnessDate}
        cacheState={data.meta.cacheState}
        actions={
          <>
            <AdminRangeSelect value={range} onChange={(value) => setQuery({ range: value })} disabled={fetching} />
            <Button variant="outline" disabled={exporting || !coverage?.available} onClick={onExport}>
              {exporting ? <Loader2 className="animate-spin" /> : <Download />}
              {exporting ? "Exporting…" : "Export billing CSV"}
            </Button>
            <Button variant="outline" asChild>
              <a href={subscription?.stripeDashboardUrl || "https://dashboard.stripe.com/billing"} target="_blank" rel="noreferrer">
                <ExternalLink /> View in Stripe
              </a>
            </Button>
          </>
        }
      />

      <div className="admin-toolbar mb-5 flex min-h-10 flex-wrap items-center gap-2 rounded-lg border p-2 shadow-xs" aria-label="Subscription filters">
        <span className="inline-flex items-center gap-1.5 px-1 text-xs font-medium text-general-muted-foreground">
          {filters.isLoading ? <Loader2 className="size-3.5 animate-spin text-general-primary" /> : <Filter className="size-3.5 text-general-primary" />}
          Filters
        </span>
        {filters.data?.data && (
          <BillingFilter label="Agencies" value={agencyId} options={filters.data.data.agencies} onChange={(value) => setQuery({ agencyId: value || null })} />
        )}
        <BillingFilter label="Plans" value={plan} options={planOptions} onChange={(value) => setQuery({ plan: value || null })} />
        {hasFilters && (
          <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs" onClick={() => setQuery({ agencyId: null, plan: null })}>
            <RotateCcw /> Clear
          </Button>
        )}
      </div>

      {!coverage?.available ? (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Stripe billing data is not populated</p>
            <p className="mt-1 text-amber-900/80">{coverage?.reason || "Run and apply the Stripe billing backfill."}</p>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-general-muted-foreground" role="status">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
            Synced {coverage.lastSuccessfulSync ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(coverage.lastSuccessfulSync)) : "recently"}
          </span>
          <span>{coverage.livemode ? "Live Stripe data" : "Stripe sandbox data"}</span>
          <span>{coverage.cronEnabled ? "Daily sync enabled" : "Daily sync disabled"}</span>
          {coverage.unresolvedCount > 0 && <span className="text-amber-700">{coverage.unresolvedCount} reconciliation issue(s)</span>}
        </div>
      )}

      <AdminKpiGrid kpis={data.kpis} />

      <section className="mt-6" aria-labelledby="recurring-revenue-title">
        <div className="mb-3">
          <h2 id="recurring-revenue-title" className="text-sm font-medium">Recurring revenue</h2>
          <p className="mt-1 text-xs text-general-muted-foreground">Business plans and agency-level subscriptions as of the period end.</p>
        </div>
        <RecurringRevenueTable data={data} />
      </section>

      <section className="mt-6" aria-labelledby="execution-credits-title">
        <div className="mb-3">
          <h2 id="execution-credits-title" className="text-sm font-medium">Execution Credits</h2>
          <p className="mt-1 text-xs text-general-muted-foreground">One-time captured revenue net of refunds in the selected period.</p>
        </div>
        <ExecutionCreditsTable data={data} />
      </section>

      {fetching && (
        <div className="admin-panel fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-general-muted-foreground" role="status">
          <Loader2 className="size-3.5 animate-spin text-general-primary" /> Refreshing…
        </div>
      )}
    </div>
  );
}
