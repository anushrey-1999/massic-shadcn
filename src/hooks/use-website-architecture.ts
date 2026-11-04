"use client";

import { useCallback } from "react";
import { isAxiosError } from "axios";
import { useApi } from "./use-api";
import type {
  GetWebsiteArchitectureParams,
  WebsiteArchitectureExport,
  WebsiteArchitectureResponse,
  WebsiteArchitectureResult,
} from "@/types/website-architecture-types";

const READ_PAGE_SIZE = 1000;

export function useWebsiteArchitecture() {
  const { execute } = useApi<WebsiteArchitectureResponse>({ platform: "python" });

  const loadWebsiteArchitecture = useCallback(
    async (
      params: GetWebsiteArchitectureParams,
      signal: AbortSignal | undefined,
    ): Promise<WebsiteArchitectureResult> => {
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

      const collect = async (activeFilters: typeof filters): Promise<WebsiteArchitectureResult> => {
        const first = await readPage(1, READ_PAGE_SIZE, activeFilters);
        if (first.status !== "success" || first.pageCount <= 1) return first;
        const items = [...first.data];
        for (let page = 2; page <= first.pageCount; page++) {
          const next = await readPage(page, READ_PAGE_SIZE, activeFilters);
          if (next.status !== "success") return next;
          items.push(...next.data);
        }
        return {
          status: "success",
          data: items,
          pageCount: Math.max(1, Math.ceil(items.length / params.perPage)),
          totalCount: first.totalCount ?? items.length,
        };
      };

      if (params.joinOperator !== "or" || filters.length < 2) {
        return readPage(params.page, params.perPage, filters);
      }

      // The route only supports AND. Build OR from complete server-filtered sets,
      // never from just the currently displayed page or from duplicate URL paths.
      const pages = await Promise.all(filters.map((filter) => collect([filter])));
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

  const fetchWebsiteArchitecture = useCallback(
    (params: GetWebsiteArchitectureParams, signal?: AbortSignal) =>
      loadWebsiteArchitecture(params, signal),
    [loadWebsiteArchitecture],
  );

  const fetchWebsiteArchitectureExport = useCallback(
    async (businessId: string, signal?: AbortSignal): Promise<WebsiteArchitectureExport> => {
      const baseQuery = new URLSearchParams({ business_id: businessId, summary: "true" });
      const read = (path: string, query: URLSearchParams) =>
        execute(`${path}?${query}`, { method: "GET", signal });

      const readPages = async (): Promise<WebsiteArchitectureResponse> => {
        const firstQuery = new URLSearchParams(baseQuery);
        firstQuery.set("page", "1");
        firstQuery.set("page_size", String(READ_PAGE_SIZE));
        const first = await read("/strategies/website-architecture", firstQuery);
        const status = first.status.toLowerCase();
        if (["error", "failed", "failure"].includes(status)) {
          throw new Error("Website architecture could not be loaded.");
        }
        if (status !== "success") {
          throw new Error("Website architecture is not ready to download.");
        }
        const output = first.output_data;
        const items = [...(output?.items ?? [])];
        const totalCount = output?.metrics?.[0]?.total_pages ?? output?.pagination?.total_count;
        const pageCount = output?.pagination?.total_pages ??
          (totalCount == null ? 1 : Math.ceil(totalCount / READ_PAGE_SIZE));
        for (let page = 2; page <= pageCount; page++) {
          const pageQuery = new URLSearchParams(baseQuery);
          pageQuery.set("page", String(page));
          pageQuery.set("page_size", String(READ_PAGE_SIZE));
          const next = await read("/strategies/website-architecture", pageQuery);
          if (next.status.toLowerCase() !== "success") {
            throw new Error("Website architecture could not be loaded.");
          }
          items.push(...(next.output_data?.items ?? []));
        }
        return {
          ...first,
          output_data: output ? {
            ...output,
            items,
            pagination: {
              page: 1,
              page_size: READ_PAGE_SIZE,
              fetched: items.length,
              total_pages: 1,
              total_count: totalCount ?? items.length,
            },
          } : output,
        };
      };

      const readCompanion = async (path: string) => {
        try {
          return await read(path, baseQuery);
        } catch (error) {
          if (isAxiosError(error) && error.response?.status === 404) {
            return error.response.data ?? { status: "error", output_data: null };
          }
          throw error;
        }
      };

      const [pages, urls, navigation] = await Promise.all([
        readPages(),
        readCompanion("/strategies/website-architecture/urls"),
        readCompanion("/strategies/website-architecture/navigation"),
      ]);
      return { pages, urls, navigation };
    },
    [execute],
  );

  return { fetchWebsiteArchitecture, fetchWebsiteArchitectureExport };
}
