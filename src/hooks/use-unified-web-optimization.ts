"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";

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
  raw: Record<string, unknown>;
}

function normalizeRow(item: Record<string, any>, index: number): UnifiedPageRow {
  const isNew = item.action === "new";
  const url = (item.url || "").toString();

  const page = isNew
    ? (item.raw?.keyword || item.raw?.slug || url || "").toString()
    : url;

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
    raw: item.raw ?? {},
  };
}

export function useUnifiedWebOptimization() {
  const platform: ApiPlatform = "node";
  const api = useApi<any>({ platform });

  const fetchUnifiedPages = useCallback(
    async (businessId: string): Promise<UnifiedPageRow[]> => {
      const endpoint = `/analytics/web-optimization/unified?businessId=${encodeURIComponent(businessId)}`;
      const response = await api.execute(endpoint, { method: "GET" });

      const topLevelErr = (response as any)?.err === true;
      const nestedErr = (response as any)?.data?.err === true;
      if (topLevelErr || nestedErr) {
        const message =
          (response as any)?.message ||
          (response as any)?.data?.message ||
          "Failed to load unified web optimization";
        const error = new Error(String(message));
        (error as any).code =
          String(message) === "Failed to fetch access token"
            ? "GOOGLE_NOT_CONNECTED"
            : "UNIFIED_WEB_ERROR";
        throw error;
      }

      const unifiedPages: any[] =
        (response as any)?.data?.unified_pages ||
        (response as any)?.unified_pages ||
        [];

      return unifiedPages.map((item, index) => normalizeRow(item, index));
    },
    [api]
  );

  return {
    fetchUnifiedPages,
    loading: api.loading,
    error: api.error,
    reset: api.reset,
  };
}
