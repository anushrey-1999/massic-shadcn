"use client";

import { useState } from "react";
import { ArrowLeft, CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AdminEmptyState } from "./admin-states";
import { AdminRankedCostTable } from "./admin-ranked-cost-table";
import { formatAdminValue } from "./admin-kpi-card";
import type { AdminApiCostData, AdminCostRankRow } from "../types";

function humanizeWorkflow(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function agencyRankRows(details: AdminApiCostData): AdminCostRankRow[] {
  return details.agencies.map((agency) => ({
    id: agency.agencyId
      ? `agency:${agency.agencyId}`
      : agency.displayName === "Direct / no agency"
        ? "bucket:direct"
        : agency.displayName === "Unknown business"
          ? "bucket:unknown"
          : "bucket:standalone",
    label: agency.displayName,
    sublabel:
      agency.businessCount > 0
        ? `${agency.businessCount} business${agency.businessCount === 1 ? "" : "es"}`
        : "Not linked to a business",
    cost: agency.cost,
    sharePct: agency.percentOfTotal,
  }));
}

function businessRankRows(
  businesses: AdminApiCostData["businesses"],
): AdminCostRankRow[] {
  return businesses.map((business) => ({
    id: business.businessId,
    label: business.displayName,
    sublabel: business.businessName
      ? business.website || undefined
      : !business.website
        ? business.businessId
        : undefined,
    badge: business.isPitch ? "Pitch" : undefined,
    siteUrl: business.website,
    cost: business.cost,
    sharePct: business.percentOfTotal,
  }));
}

function businessesForAgency(
  details: AdminApiCostData,
  agencyRowId: string,
) {
  if (agencyRowId.startsWith("agency:")) {
    const agencyId = agencyRowId.slice("agency:".length);
    return details.businesses.filter(
      (business) => business.agencyId === agencyId,
    );
  }
  if (agencyRowId === "bucket:direct") {
    return details.businesses.filter(
      (business) =>
        business.businessId !== "standalone" &&
        business.attributed &&
        !business.agencyId,
    );
  }
  if (agencyRowId === "bucket:unknown") {
    return details.businesses.filter(
      (business) =>
        business.businessId !== "standalone" && !business.attributed,
    );
  }
  return details.businesses.filter(
    (business) => business.businessId === "standalone",
  );
}

function workflowRankRows(details: AdminApiCostData): AdminCostRankRow[] {
  return details.workflows.map((workflow) => ({
    id: workflow.workflowName,
    label: humanizeWorkflow(workflow.displayName),
    sublabel: workflow.workflowName,
    cost: workflow.cost,
    sharePct: workflow.percentOfTotal,
  }));
}

function ProviderBreakdown({ details }: { details: AdminApiCostData }) {
  if (!details.providers.length) {
    return (
      <AdminEmptyState
        title="No provider usage recorded"
        description="Infer returned no provider-level LLM costs."
      />
    );
  }
  return (
    <div className="space-y-5 p-4">
      {details.providers.map((provider, index) => {
        const width = Math.min(100, Math.max(0, provider.sharePct));
        return (
          <div key={provider.key}>
            <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{provider.label}</span>
              <span className="text-right tabular-nums">
                {formatAdminValue(provider.key, provider.cost)}
                <span className="ml-2 text-xs text-general-muted-foreground">
                  {provider.sharePct.toFixed(1)}%
                </span>
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded bg-general-secondary"
              role="progressbar"
              aria-label={`${provider.label} share of LLM cost`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(width)}
            >
              <div
                className={
                  index === 0
                    ? "h-full rounded bg-general-primary transition-[width] duration-200 motion-reduce:transition-none"
                    : "h-full rounded bg-general-muted-foreground transition-[width] duration-200 motion-reduce:transition-none"
                }
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminCostBreakdownSection({
  details,
}: {
  details: AdminApiCostData;
}) {
  const [selectedAgency, setSelectedAgency] =
    useState<AdminCostRankRow | null>(null);
  const selectedBusinesses = selectedAgency
    ? businessesForAgency(details, selectedAgency.id)
    : [];

  return (
    <section
      className="admin-panel overflow-hidden rounded-lg border"
      aria-labelledby="cost-breakdown-title"
    >
      <Tabs defaultValue="provider" className="gap-0">
        <div className="flex flex-col gap-3 border-b border-general-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CircleDollarSign
                className="size-4 text-general-primary"
                aria-hidden="true"
              />
              <h2 id="cost-breakdown-title" className="text-sm font-medium">
                Cost breakdown
              </h2>
            </div>
            <p className="mt-1 text-xs text-general-muted-foreground">
              Independent lifetime views of the same recorded LLM spend.
            </p>
          </div>
          <div className="max-w-full overflow-x-auto">
            <TabsList className="h-10 rounded-lg">
              <TabsTrigger className="h-8 rounded-md text-xs" value="provider">
                Provider
              </TabsTrigger>
              <TabsTrigger className="h-8 rounded-md text-xs" value="agency">
                Agency
              </TabsTrigger>
              <TabsTrigger className="h-8 rounded-md text-xs" value="business">
                Business
              </TabsTrigger>
              <TabsTrigger className="h-8 rounded-md text-xs" value="workflow">
                Workflow
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="provider" className="m-0">
          <div className="border-b border-general-border px-4 py-3 text-xs text-general-muted-foreground">
            Global OpenAI and Anthropic totals from Infer.
          </div>
          <ProviderBreakdown details={details} />
        </TabsContent>

        <TabsContent value="agency" className="m-0">
          {selectedAgency ? (
            <>
              <div className="flex flex-col gap-3 border-b border-general-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{selectedAgency.label}</p>
                  <p className="mt-1 text-xs text-general-muted-foreground">
                    {selectedBusinesses.length} business
                    {selectedBusinesses.length === 1 ? "" : "es"} contributing
                    to this agency total.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => setSelectedAgency(null)}
                >
                  <ArrowLeft />
                  All agencies
                </Button>
              </div>
              <AdminRankedCostTable
                rows={businessRankRows(selectedBusinesses)}
                emptyTitle="No businesses found"
                emptyDescription="No business usage is associated with this agency."
              />
            </>
          ) : (
            <>
              <div className="border-b border-general-border px-4 py-3 text-xs text-general-muted-foreground">
                Agency totals are rolled up from business-attributed lifetime
                costs. Select an agency to view its businesses.
              </div>
              {details.agencyAttributionAvailable ? (
                <AdminRankedCostTable
                  rows={agencyRankRows(details)}
                  emptyTitle="No agency usage available"
                  emptyDescription="No Infer businesses could be matched to agency data."
                  onRowSelect={setSelectedAgency}
                />
              ) : (
                <AdminEmptyState
                  title="Agency attribution unavailable"
                  description="Business usage is available, but CoreDB agency data could not be loaded."
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="business" className="m-0">
          <div className="border-b border-general-border px-4 py-3 text-xs text-general-muted-foreground">
            Includes business-attributed costs and standalone usage.
          </div>
          <AdminRankedCostTable
            rows={businessRankRows(details.businesses)}
            emptyTitle="No business usage recorded"
            emptyDescription="Infer returned no business-attributed LLM costs."
          />
        </TabsContent>

        <TabsContent value="workflow" className="m-0">
          <div className="border-b border-general-border px-4 py-3 text-xs text-general-muted-foreground">
            Workflow totals are platform-wide and cannot be attributed to a
            business or agency.
          </div>
          <AdminRankedCostTable
            rows={workflowRankRows(details)}
            emptyTitle="No workflow usage recorded"
            emptyDescription="Infer returned no workflow-level LLM costs."
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
