import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export type FilterDimension = "query" | "page" | "content_group";

export interface DeepdiveFilter {
  dimension: FilterDimension;
  expression: string;
  operator: "equals" | "contains";
}

export interface UseOrganicDeepdiveFiltersReturn {
  filters: DeepdiveFilter[];
  queryFilter: DeepdiveFilter | null;
  pageFilter: DeepdiveFilter | null;
  contentGroupFilter: DeepdiveFilter | null;
  addFilter: (filter: DeepdiveFilter) => void;
  removeFilter: (dimension: FilterDimension) => void;
  clearAllFilters: () => void;
  hasFilters: boolean;
  filtersForApi: DeepdiveFilter[];
}

export function useOrganicDeepdiveFilters(): UseOrganicDeepdiveFiltersReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(() => {
    const result: DeepdiveFilter[] = [];

    const query = searchParams.get("query");
    const page = searchParams.get("page");
    const contentGroup = searchParams.get("content_group");

    if (query) {
      result.push({ dimension: "query", expression: query, operator: "equals" });
    }
    if (page) {
      result.push({ dimension: "page", expression: page, operator: "equals" });
    }
    if (contentGroup) {
      result.push({ dimension: "content_group", expression: contentGroup, operator: "equals" });
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

  const updateUrlParams = useCallback(
    (newFilters: DeepdiveFilter[]) => {
      const params = new URLSearchParams(searchParams.toString());

      params.delete("query");
      params.delete("page");
      params.delete("content_group");

      for (const filter of newFilters) {
        params.set(filter.dimension, filter.expression);
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
    return filters.map((f) => ({
      dimension: f.dimension,
      expression: f.expression,
      operator: f.operator,
    }));
  }, [filters]);

  return {
    filters,
    queryFilter,
    pageFilter,
    contentGroupFilter,
    addFilter,
    removeFilter,
    clearAllFilters,
    hasFilters: filters.length > 0,
    filtersForApi,
  };
}
