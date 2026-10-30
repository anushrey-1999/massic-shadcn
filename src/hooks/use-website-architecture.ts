"use client";

import { useCallback } from "react";
import { useApi } from "./use-api";
import type {
  GetWebsiteArchitectureParams,
  WebsiteArchitectureResponse,
  WebsiteArchitectureResult,
} from "@/types/website-architecture-types";

export function useWebsiteArchitecture() {
  const { execute } = useApi<WebsiteArchitectureResponse>({ platform: "python" });

  const fetchWebsiteArchitecture = useCallback(
    async (params: GetWebsiteArchitectureParams, signal?: AbortSignal): Promise<WebsiteArchitectureResult> => {
      const query = new URLSearchParams({
        business_id: params.businessId,
      });
      if (params.search.trim()) query.set("search", params.search.trim());

      // The API silently ignores unsupported sort fields and rejects unsupported filters.
      const sort = params.sort.filter((item) => item.field === "title");
      if (sort.length) query.set("sort", JSON.stringify(sort));
      const filters = params.filters
        .map(({ field, value, operator }) => ({
          field: field === "sources" ? "source" : field,
          value,
          operator,
        }))
        .filter((filter) => ["page_type", "disposition", "source"].includes(filter.field));

      const readPage = async (page: number, pageSize: number, activeFilters: typeof filters): Promise<WebsiteArchitectureResult> => {
        const pageQuery = new URLSearchParams(query);
        pageQuery.set("page", String(page));
        pageQuery.set("page_size", String(pageSize));
        if (activeFilters.length) pageQuery.set("filters", JSON.stringify(activeFilters));

        const response = await execute(`/strategies/website-architecture?${pageQuery}`, { method: "GET", signal });
        const status = response.status.toLowerCase();
        if (["error", "failed", "failure"].includes(status)) {
          throw new Error("Website architecture could not be loaded.");
        }
        const output = response.output_data;
        const totalCount = output?.metrics?.[0]?.total_pages ?? output?.pagination?.total_count;
        return {
          status,
          data: output?.items ?? [],
          pageCount: output?.pagination?.total_pages ??
            (totalCount == null ? 0 : Math.ceil(totalCount / pageSize)),
          totalCount,
        };
      };

      if (params.joinOperator !== "or" || filters.length < 2) {
        return readPage(params.page, params.perPage, filters);
      }

      // The route only supports AND. Build OR from complete server-filtered sets,
      // never from just the currently displayed page or from duplicate URL paths.
      const matches = await Promise.all(filters.map(async (filter) => {
        const first = await readPage(1, 1000, [filter]);
        const pages = [first];
        for (let page = 2; page <= first.pageCount && first.status === "success"; page++) {
          const next = await readPage(page, 1000, [filter]);
          pages.push(next);
          if (next.status !== "success") break;
        }
        return pages;
      }));
      const pages = matches.flat();
      const unfinished = pages.find((page) => page.status !== "success");
      if (unfinished) return unfinished;
      const unique = new Map(pages.flatMap((page) => page.data).map((page) => [page.page_id, page]));
      const items = [...unique.values()];
      if (sort.length) {
        items.sort((a, b) => {
          const order = a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
          return sort[0].desc ? -order : order;
        });
      }
      return {
        status: "success",
        data: items.slice((params.page - 1) * params.perPage, params.page * params.perPage),
        pageCount: Math.ceil(items.length / params.perPage),
        totalCount: items.length,
      };
    },
    [execute],
  );

  return { fetchWebsiteArchitecture };
}
