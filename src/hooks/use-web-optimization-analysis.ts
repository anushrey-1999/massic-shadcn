"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import {
  tableApplyAdvancedFilters,
  tablePaginate,
  tableSort,
} from "@/utils/data-table-utils";
import type {
  GetWebOptimizationAnalysisSchema,
  WebOptimizationAnalysisApiResponse,
  WebOptimizationAnalysisItem,
  WebOptimizationAnalysisRow,
} from "@/types/web-optimization-analysis-types";

function safeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function extractPages(response: WebOptimizationAnalysisApiResponse): WebOptimizationAnalysisItem[] {
  if (Array.isArray((response as any).pages)) return (response as any).pages;
  if (response.data && Array.isArray((response.data as any).pages)) return (response.data as any).pages;

  const result = (response as any).result;
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.pages)) return result.pages;

  const fallbackKeys = ["pages", "results", "items", "optimizations", "data", "output", "output_data"];
  for (const key of fallbackKeys) {
    const candidate = (response as any)[key];
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object" && Array.isArray(candidate.pages)) return candidate.pages;
  }

  if (response.data && typeof response.data === "object") {
    for (const key of fallbackKeys) {
      const candidate = (response.data as any)[key];
      if (Array.isArray(candidate)) return candidate;
      if (candidate && typeof candidate === "object" && Array.isArray(candidate.pages)) return candidate.pages;
    }
  }

  return [];
}

function normalizeRow(item: WebOptimizationAnalysisItem, index: number): WebOptimizationAnalysisRow {
  const pageUrl = (item.page_url || "").toString();
  const opportunity = (item.opportunity || "").toString();
  const suggestedChanges = Array.isArray(item.suggested_changes) ? item.suggested_changes : [];

  const impressions = safeNumber(item.gsc?.impressions);
  const clicks = safeNumber(item.gsc?.clicks);
  const avgPosition = safeNumber(item.gsc?.avgpos);
  const ctr = safeNumber(item.gsc?.ctr);
  const sessions = safeNumber(item.ga4?.sessions);
  const goals = safeNumber(item.ga4?.conversions);
  const ops = safeNumber(item.final_ops);

  return {
    id: `${pageUrl || "page"}-${opportunity || "opp"}-${index}`,
    page_url: pageUrl,
    opportunity,
    suggestions_count: suggestedChanges.length,
    impressions,
    clicks,
    avg_position: avgPosition,
    ctr,
    sessions,
    goals,
    ops,
    suggested_changes: suggestedChanges,
  };
}

function applySearch(rows: WebOptimizationAnalysisRow[], search: string | undefined): WebOptimizationAnalysisRow[] {
  const term = (search || "").trim().toLowerCase();
  if (!term) return rows;

  return rows.filter((row) => {
    if (row.page_url.toLowerCase().includes(term)) return true;
    if (row.opportunity.toLowerCase().includes(term)) return true;

    const suggestionHit = row.suggested_changes.some((s) => {
      const action = (s.action || "").toLowerCase();
      const category = (s.category || "").toLowerCase();
      return action.includes(term) || category.includes(term);
    });
    if (suggestionHit) return true;

    const numericHaystack = `${row.impressions} ${row.clicks} ${row.sessions} ${row.goals}`;
    return numericHaystack.includes(term);
  });
}

export function useWebOptimizationAnalysis() {
  const platform: ApiPlatform = "node";
  const api = useApi<WebOptimizationAnalysisApiResponse>({ platform });

  const fetchWebOptimizationAnalysisAll = useCallback(
    async (businessId: string) => {
      const endpoint = "/analytics/web-optimization/analysis";
      const response = await api.execute(endpoint, {
        method: "POST",
        data: { businessId },
      });

      const topLevelErr = (response as any)?.err === true || (response as any)?.success === false;
      const nestedErr = (response as any)?.data?.err === true || (response as any)?.data?.success === false;
      if (topLevelErr || nestedErr) {
        const message =
          (response as any)?.message ||
          (response as any)?.data?.message ||
          "Failed to load optimization analysis";

        const error = new Error(String(message));
        (error as any).code =
          String(message) === "Failed to fetch access token"
            ? "GOOGLE_NOT_CONNECTED"
            : "WEB_OPTIMIZATION_ERROR";
        throw error;
      }

      const items = extractPages(response);
      return items.map((item, index) => normalizeRow(item, index));
    },
    [api]
  );

  const fetchWebOptimizationAnalysis = useCallback(
    async (params: GetWebOptimizationAnalysisSchema) => {
      const allRows = await fetchWebOptimizationAnalysisAll(params.business_id);

      const searched = applySearch(allRows, params.search);

      const isAdvancedFiltering = Array.isArray(params.filters) && params.filters.length > 0;
      const filtered = isAdvancedFiltering
        ? tableApplyAdvancedFilters(
          searched,
          params.filters as any,
          (params.joinOperator || "and") as any
        )
        : searched;

      const sorted = params.sort && params.sort.length > 0
        ? tableSort(filtered, params.sort as any)
        : filtered;

      const { data, pageCount, total } = tablePaginate(sorted, params.page, params.perPage);

      return {
        data,
        pageCount,
        total,
        allCount: allRows.length,
      };
    },
    [fetchWebOptimizationAnalysisAll]
  );

  return {
    fetchWebOptimizationAnalysisAll,
    fetchWebOptimizationAnalysis,
    loading: api.loading,
    error: api.error,
    reset: api.reset,
  };
}
