"use client";

import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { AdminEmptyState } from "../components/admin-states";
import { AdminStatusBadge } from "../components/status-badge";
import { formatAdminValue } from "../components/admin-kpi-card";
import { SiteFavicon } from "@/components/organisms/WebChannels/platform-icon";
import { cn } from "@/lib/utils";
import type { AdminBusiness } from "../types";

function Connection({
  connected,
  label,
}: {
  connected: boolean;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-general-muted-foreground">
      {connected ? (
        <Check className="size-3.5 text-emerald-700" />
      ) : (
        <Minus className="size-3.5" />
      )}
      <span className="sr-only sm:not-sr-only">{label}</span>
    </span>
  );
}

export function AdminBusinessTable({
  rows,
  viewportScroll = false,
}: {
  rows: AdminBusiness[];
  viewportScroll?: boolean;
}) {
  if (!rows.length)
    return (
      <div className="admin-panel w-full min-w-0 max-w-full rounded-lg border">
        <AdminEmptyState title="No businesses found" />
      </div>
    );
  return (
    <div
      className={cn(
        "admin-panel w-full min-w-0 max-w-full overflow-hidden rounded-lg border [contain:inline-size]",
        viewportScroll && "h-full min-h-0",
      )}
    >
      <div
        className={cn(
          "w-full min-w-0 max-w-full touch-pan-x overflow-auto overscroll-contain",
          viewportScroll && "h-full min-h-0",
        )}
        role="region"
        aria-label="Businesses table"
        tabIndex={0}
      >
        <table className="w-full min-w-[980px] text-sm">
          <thead className="sticky top-0 z-10 bg-general-primary-foreground text-general-muted-foreground shadow-[0_1px_0_rgba(10,10,10,0.08)]">
            <tr className="h-9 border-b border-general-border">
              {[
                "Business",
                "Agency",
                "Status",
                "Plan",
                "Connections",
                "Clicks",
                "Impressions",
                "",
              ].map((label) => (
                <th
                  key={label}
                  className="px-3 text-left font-medium last:w-12"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.business_id}
                className="group h-[52px] border-b border-general-border transition-colors duration-150 last:border-0 hover:bg-general-primary/5"
              >
                <td className="max-w-[280px] px-3">
                  <Link
                    href={`/admin/businesses/${row.business_id}`}
                    className="flex min-w-0 items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary"
                  >
                    <SiteFavicon siteUrl={row.website} className="size-8" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium transition-colors group-hover:text-general-primary">
                        {row.business_name}
                      </span>
                      <span className="block truncate text-xs text-general-muted-foreground">
                        {row.website || "No website"}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="max-w-[180px] truncate px-3">
                  {row.agency_id ? (
                    <Link
                      href={`/admin/agencies/${row.agency_id}`}
                      className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary"
                    >
                      {row.agency_name || "Unknown"}
                    </Link>
                  ) : (
                    "Unknown"
                  )}
                </td>
                <td className="px-3">
                  <AdminStatusBadge status={row.status} />
                </td>
                <td className="px-3 capitalize">{row.plan}</td>
                <td className="px-3">
                  <div className="flex gap-2">
                    <Connection connected={row.connected_gsc} label="GSC" />
                    <Connection connected={row.connected_ga4} label="GA4" />
                    <Connection connected={row.connected_cms} label="CMS" />
                  </div>
                </td>
                <td className="px-3 tabular-nums">
                  {formatAdminValue("clicks", Number(row.clicks || 0))}
                </td>
                <td className="px-3 tabular-nums">
                  {formatAdminValue(
                    "impressions",
                    Number(row.impressions || 0),
                  )}
                </td>
                <td className="px-3">
                  <Link
                    href={`/admin/businesses/${row.business_id}`}
                    aria-label={`Open ${row.business_name} snapshot`}
                    className="inline-flex size-8 items-center justify-center rounded-md text-general-muted-foreground transition-all duration-200 hover:bg-general-primary/10 hover:text-general-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary"
                  >
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
