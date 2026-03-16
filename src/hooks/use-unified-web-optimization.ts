"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";

export interface UnifiedPageSuggestion {
  category?: string;
  action?: string;
}

export interface UnifiedPageRow {
  id: string;
  page: string;
  page_type: string;
  label: "New" | "Existing";
  ups: number;
  action: string;
  tier: string;
  url: string;
  keyword_clusters: string[] | null;
  page_id: string | null;
  suggested_changes?: UnifiedPageSuggestion[] | null;
  raw: Record<string, unknown>;
  /** BI / scoring fields (from API, may be in raw) */
  final_ops?: number;
  type_weight?: number;
  score_final?: number;
}

export const NO_SNAPSHOT_CODE = "NO_SNAPSHOT";

function normalizeRow(item: Record<string, any>, index: number): UnifiedPageRow {
  const isNew = item.action === "new";
  const url = (item.url || "").toString();

  const page = isNew
    ? (item.raw?.keyword || item.raw?.slug || url || "").toString()
    : url;

  const suggestedChangesCandidate =
    item.suggested_changes ??
    item.suggestedChanges ??
    item.raw?.suggested_changes ??
    item.raw?.suggestedChanges ??
    item.raw?.suggestions ??
    item.suggestions;

  return {
    id: `unified-${index}`,
    page,
    page_type: (item.page_type || "").toString(),
    label: isNew ? "New" : "Existing",
    ups: typeof item.ups === "number" ? item.ups : 0,
    action: (item.action || "").toString(),
    tier: (item.tier || "").toString(),
    url,
    keyword_clusters: Array.isArray(item.keyword_clusters) ? item.keyword_clusters : null,
    page_id: item.raw?.page_id ?? null,
    suggested_changes: Array.isArray(suggestedChangesCandidate) ? suggestedChangesCandidate : null,
    raw: item.raw ?? {},
    final_ops: typeof item.final_ops === "number" ? item.final_ops : typeof item.raw?.final_ops === "number" ? item.raw.final_ops : undefined,
    type_weight: typeof item.type_weight === "number" ? item.type_weight : typeof item.raw?.type_weight === "number" ? item.raw.type_weight : undefined,
    score_final: typeof item.score_final === "number" ? item.score_final : typeof item.raw?.score_final === "number" ? item.raw.score_final : undefined,
  };
}

function extractUnifiedPages(response: any): any[] {
  const data = response?.data;
  if (data && Array.isArray(data.unified_pages)) return data.unified_pages;
  if (Array.isArray(response?.unified_pages)) return response.unified_pages;
  return [];
}

export function useUnifiedWebOptimization() {
  const platform: ApiPlatform = "node";
  const api = useApi<any>({ platform });

  const fetchUnifiedPagesFromSnapshot = useCallback(
    async (businessId: string): Promise<UnifiedPageRow[]> => {
      const snapshotEndpoint = `/analytics/web-optimization/unified/snapshot?businessId=${encodeURIComponent(businessId)}`;
      try {
        const snapshotResponse = await api.execute(snapshotEndpoint, { method: "GET" });

        const topLevelErr = (snapshotResponse as any)?.err === true;
        const nestedErr = (snapshotResponse as any)?.data?.err === true;
        if (topLevelErr || nestedErr) {
          const message =
            (snapshotResponse as any)?.message ||
            (snapshotResponse as any)?.data?.message ||
            "Failed to load unified web optimization snapshot";
          const error = new Error(String(message));
          (error as any).code =
            String(message) === "Failed to fetch access token"
              ? "GOOGLE_NOT_CONNECTED"
              : "UNIFIED_WEB_ERROR";
          throw error;
        }

        // Snapshot returns metadata only; fetch the actual list from the unified endpoint (live).
        const unifiedEndpoint = `/analytics/web-optimization/unified?businessId=${encodeURIComponent(businessId)}`;
        const unifiedResponse = await api.execute(unifiedEndpoint, { method: "GET" });
        const unifiedErr = (unifiedResponse as any)?.err === true;
        if (unifiedErr) {
          const message =
            (unifiedResponse as any)?.message ||
            (unifiedResponse as any)?.data?.message ||
            "Failed to load unified list";
          throw new Error(String(message));
        }

        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.log("[All Pages] unifiedResponse.data", (unifiedResponse as any)?.data);
          // eslint-disable-next-line no-console
          console.log("[All Pages] unified_pages", extractUnifiedPages(unifiedResponse));
        }

        const unifiedPages = extractUnifiedPages(unifiedResponse);
        return unifiedPages.map((item: Record<string, any>, index: number) => normalizeRow(item, index));
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const noSnapshot = new Error(err?.response?.data?.message || "No snapshot found for this business");
          (noSnapshot as any).code = NO_SNAPSHOT_CODE;
          throw noSnapshot;
        }
        throw err;
      }
    },
    [api]
  );

  const triggerGenerate = useCallback(
    async (businessId: string): Promise<{ unified_pages: any[] }> => {
      const endpoint = `/analytics/web-optimization/unified/generate`;
      const response = await api.execute(endpoint, {
        method: "POST",
        data: { businessId },
      });

      const topLevelErr = (response as any)?.err === true;
      if (topLevelErr) {
        const message =
          (response as any)?.message ||
          (response as any)?.data?.message ||
          "Failed to generate unified list";
        throw new Error(String(message));
      }

      const data = (response as any)?.data;
      const pages = Array.isArray(data?.unified_pages) ? data.unified_pages : [];
      return { unified_pages: pages };
    },
    [api]
  );

  const fetchUnifiedPages = useCallback(
    async (businessId: string): Promise<UnifiedPageRow[]> => {
      return fetchUnifiedPagesFromSnapshot(businessId);
    },
    [fetchUnifiedPagesFromSnapshot]
  );

  return {
    fetchUnifiedPages,
    fetchUnifiedPagesFromSnapshot,
    triggerGenerate,
    loading: api.loading,
    error: api.error,
    reset: api.reset,
  };
}
