import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { ContentGroupFilterSource } from "@/utils/custom-content-groups";

export type FilterDimension =
  | "query"
  | "page"
  | "content_group"
  | "keyword_scope";
export type ApiFilterDimension = "query" | "page" | "content_group";
export type DeepdiveKeywordScope = "branded" | "non-branded";
export type DeepdiveApiOperator =
  | "equals"
  | "contains"
  | "contains_any"
  | "contains_none";

export interface DeepdiveFilter {
  dimension: FilterDimension;
  expression: string;
  operator: "equals" | "contains";
  source?: ContentGroupFilterSource;
}

export interface DeepdiveApiFilter {
  dimension: ApiFilterDimension;
  expression: string | string[];
  operator: DeepdiveApiOperator;
  label?: string;
  source?: ContentGroupFilterSource;
}

export interface UseOrganicDeepdiveFiltersReturn {
  filters: DeepdiveFilter[];
  queryFilter: DeepdiveFilter | null;
  pageFilter: DeepdiveFilter | null;
  contentGroupFilter: DeepdiveFilter | null;
  keywordScopeFilter: DeepdiveFilter | null;
  addFilter: (filter: DeepdiveFilter) => void;
  removeFilter: (dimension: FilterDimension) => void;
  clearAllFilters: () => void;
  hasFilters: boolean;
  filtersForApi: DeepdiveApiFilter[];
}

function normalizeBrandTerms(brandTerms?: string[] | null): string[] {
  return (brandTerms || [])
    .map((term) => String(term || "").trim())
    .filter(Boolean);
}

export function useOrganicDeepdiveFilters(
  brandTerms?: string[] | null
): UseOrganicDeepdiveFiltersReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const normalizedBrandTerms = useMemo(
    () => normalizeBrandTerms(brandTerms),
    [brandTerms]
  );

  const filters = useMemo(() => {
    const result: DeepdiveFilter[] = [];

    const query = searchParams.get("query");
    const page = searchParams.get("page");
    const contentGroup = searchParams.get("content_group");
    const contentGroupType = searchParams.get("content_group_type");
    const keywordScope = searchParams.get("keyword_scope");

    if (query) {
      result.push({ dimension: "query", expression: query, operator: "equals" });
    }
    if (page) {
      result.push({ dimension: "page", expression: page, operator: "equals" });
    }
    if (contentGroup) {
      result.push({
        dimension: "content_group",
        expression: contentGroup,
        operator: "equals",
        source: contentGroupType === "custom" ? "custom" : "default",
      });
    }
    if (keywordScope === "branded" || keywordScope === "non-branded") {
      result.push({
        dimension: "keyword_scope",
        expression: keywordScope,
        operator: "equals",
      });
    }

    return result;
  }, [searchParams]);

  const queryFilter = useMemo(
    () => filters.find((f) => f.dimension === "query") || null,
    [filters]
  );

  const pageFilter = useMemo(
    () => filters.find((f) => f.dimension === "page") || null,
    [filters]
  );

  const contentGroupFilter = useMemo(
    () => filters.find((f) => f.dimension === "content_group") || null,
    [filters]
  );

  const keywordScopeFilter = useMemo(
    () => filters.find((f) => f.dimension === "keyword_scope") || null,
    [filters]
  );

  const updateUrlParams = useCallback(
    (newFilters: DeepdiveFilter[]) => {
      const params = new URLSearchParams(searchParams.toString());

      params.delete("query");
      params.delete("page");
      params.delete("content_group");
      params.delete("content_group_type");
      params.delete("keyword_scope");

      for (const filter of newFilters) {
        params.set(filter.dimension, filter.expression);
        if (filter.dimension === "content_group" && filter.source) {
          params.set("content_group_type", filter.source);
        }
      }

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const addFilter = useCallback(
    (filter: DeepdiveFilter) => {
      const existingFilters = filters.filter((f) => f.dimension !== filter.dimension);
      updateUrlParams([...existingFilters, filter]);
    },
    [filters, updateUrlParams]
  );

  const removeFilter = useCallback(
    (dimension: FilterDimension) => {
      const newFilters = filters.filter((f) => f.dimension !== dimension);
      updateUrlParams(newFilters);
    },
    [filters, updateUrlParams]
  );

  const clearAllFilters = useCallback(() => {
    updateUrlParams([]);
  }, [updateUrlParams]);

  const filtersForApi = useMemo(() => {
    return filters.flatMap<DeepdiveApiFilter>((filter) => {
      if (filter.dimension === "keyword_scope") {
        const label =
          filter.expression === "branded"
            ? "Branded queries"
            : "Non-branded queries";

        return [
          {
            dimension: "query",
            expression: normalizedBrandTerms,
            operator:
              filter.expression === "branded"
                ? "contains_any"
                : "contains_none",
            label,
          },
        ];
      }

      return [
        {
          dimension: filter.dimension as ApiFilterDimension,
          expression: filter.expression,
          operator: filter.operator,
          ...(filter.dimension === "content_group" && filter.source ? { source: filter.source } : {}),
        },
      ];
    });
  }, [filters, normalizedBrandTerms]);

  return {
    filters,
    queryFilter,
    pageFilter,
    contentGroupFilter,
    keywordScopeFilter,
    addFilter,
    removeFilter,
    clearAllFilters,
    hasFilters: filters.length > 0,
    filtersForApi,
  };
}
