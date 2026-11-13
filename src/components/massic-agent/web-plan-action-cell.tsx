"use client";

import { WebPageActionCell } from "@/components/organisms/web-page-actions/web-page-action-cell";
import { parseWebPageType } from "@/lib/web-page-types";
import type { PlanItem } from "./types";

export function WebPlanActionCell({ businessId, item }: { businessId: string; item: PlanItem }) {
  if (!item.page_id || item.valid === false) return <span className="text-muted-foreground">—</span>;

  // Saved plans can still contain the page types used before Web Architecture.
  const savedType = item.page_type?.trim().toLowerCase();
  const pageType = parseWebPageType(savedType) ?? (savedType === "blog" ? "editorial" : "page");

  return (
    <WebPageActionCell
      businessId={businessId}
      row={{
        page_id: item.page_id,
        cluster_name: item.cluster_name || item.title || item.page_id,
        page_type: pageType,
        status: item.status || "new",
      }}
    />
  );
}
