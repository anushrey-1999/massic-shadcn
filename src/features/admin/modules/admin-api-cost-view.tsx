"use client";

import { Info } from "lucide-react";
import { AdminCostBreakdownSection } from "../components/admin-cost-breakdown-section";
import { AdminKpiGrid } from "../components/admin-kpi-card";
import { AdminErrorState } from "../components/admin-states";
import type { AdminModuleData } from "../types";

function fetchedLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminApiCostView({
  data,
  onRetry,
  pending,
}: {
  data: AdminModuleData;
  onRetry: () => void;
  pending: boolean;
}) {
  const details = data.apiCost;
  const unavailable =
    !details || data.kpis.every((kpi) => kpi.availability.state === "unavailable");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-general-muted-foreground">
        <span className="inline-flex h-6 items-center rounded border border-general-border bg-general-secondary px-2 font-medium text-general-unofficial-foreground-alt">
          Lifetime · LLM only
        </span>
        <span>OpenAI and Anthropic costs from Infer usage tracking.</span>
      </div>

      <AdminKpiGrid kpis={data.kpis} />

      {unavailable || !details ? (
        <AdminErrorState
          message={
            data.kpis.find(
              (kpi) => kpi.availability.state === "unavailable",
            )?.availability.reason ?? undefined
          }
          onRetry={onRetry}
          pending={pending}
        />
      ) : (
        <>
          <section
            className="admin-panel rounded-lg border p-4"
            aria-labelledby="coverage-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="coverage-title" className="text-sm font-medium">
                  Data coverage
                </h2>
                <p className="mt-1 text-xs text-general-muted-foreground">
                  Scope and attribution available in this lifetime snapshot.
                </p>
              </div>
              <Info
                className="size-4 shrink-0 text-general-primary"
                aria-hidden="true"
              />
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-md bg-general-primary/5 p-3">
                <dt className="text-xs text-general-muted-foreground">
                  Included
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  OpenAI and Anthropic
                </dd>
              </div>
              <div className="rounded-md bg-general-secondary p-3">
                <dt className="text-xs text-general-muted-foreground">
                  Not yet available
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  Date ranges and other providers
                </dd>
              </div>
              <div className="rounded-md bg-general-secondary p-3">
                <dt className="text-xs text-general-muted-foreground">
                  Businesses tracked
                </dt>
                <dd className="mt-1 text-sm font-medium tabular-nums">
                  {details.trackedBusinessCount}
                </dd>
              </div>
              <div className="rounded-md bg-general-secondary p-3">
                <dt className="text-xs text-general-muted-foreground">
                  Last fetched
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {fetchedLabel(details.fetchedAt) || "Unknown"}
                </dd>
              </div>
            </dl>

            {Math.abs(details.reconciliation.delta) > 0.01 && (
              <p className="mt-3 text-xs text-general-muted-foreground">
                Business-level records differ from the Infer total by{" "}
                {details.reconciliation.delta.toFixed(2)} due to source
                aggregation or rounding.
              </p>
            )}
          </section>

          <AdminCostBreakdownSection details={details} />
        </>
      )}
    </div>
  );
}
