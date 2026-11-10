"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import { AlertCircle, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import { getFiltersStateParser, getSortingStateParser } from "@/components/filter-table/parsers";
import { Button } from "@/components/ui/button";
import { useWebsiteArchitecture } from "@/hooks/use-website-architecture";
import { formatVolume } from "@/lib/format";
import {
  getWebPageQuickTypeFilter,
  getWebPageTypesForQuickFilter,
  type WebPageQuickTypeFilter,
} from "@/lib/web-page-types";
import type { WebsiteArchitectureExport, WebsiteArchitecturePage } from "@/types/website-architecture-types";
import { WebsiteArchitectureDownloadDialog } from "./website-architecture-download-dialog";
import { ARCHITECTURE_QUERY_KEYS, WebsiteArchitectureTable } from "./website-architecture-table";

const CSV_COLUMNS: Array<{
  header: string;
  value: (page: WebsiteArchitecturePage) => unknown;
}> = [
  { header: "page_id", value: (page) => page.page_id },
  { header: "title", value: (page) => page.title },
  { header: "name", value: (page) => page.name },
  { header: "page_type", value: (page) => page.page_type },
  { header: "page_subtype", value: (page) => page.page_subtype },
  { header: "category", value: (page) => page.category },
  { header: "disposition", value: (page) => page.disposition },
  { header: "parent_page_id", value: (page) => page.parent_page_id },
  { header: "final_url", value: (page) => page.final_url },
  { header: "current_url", value: (page) => page.current_url },
  { header: "keyword", value: (page) => page.keyword },
  { header: "supporting_keywords", value: (page) => page.supporting_keywords?.join(" | ") },
  { header: "search_volume", value: (page) => page.search_volume },
  { header: "business_relevance_score", value: (page) => page.business_relevance_score },
  { header: "business_applicability", value: (page) => page.business_applicability },
  { header: "confidence", value: (page) => page.confidence },
  { header: "sources", value: (page) => page.sources?.join(" | ") },
  { header: "alternate_framing", value: (page) => page.alternate_framing },
  { header: "offerings", value: (page) => page.modifiers?.offerings?.join(" | ") },
  { header: "customer_type", value: (page) => page.modifiers?.customer_type },
  { header: "location", value: (page) => page.modifiers?.location },
  { header: "service_area", value: (page) => page.modifiers?.service_area },
  { header: "sections", value: (page) => page.sections },
];

function escapeCsv(value: unknown) {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) ?? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadTextFile(filename: string, contents: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadWebsiteArchitectureCsv(pages: WebsiteArchitecturePage[], filename: string) {
  const rows = [
    CSV_COLUMNS.map((column) => column.header),
    ...pages.map((page) => CSV_COLUMNS.map((column) => column.value(page))),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\n")}`;
  downloadTextFile(filename, csv, "text/csv;charset=utf-8");
}

function downloadWebsiteArchitectureJson(payload: WebsiteArchitectureExport, filename: string) {
  downloadTextFile(filename, JSON.stringify(payload, null, 2), "application/json");
}

const stateParsers = {
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(100),
  search: parseAsString.withDefault(""),
  sort: getSortingStateParser<WebsiteArchitecturePage>(["title"]).withDefault([]),
  filters: getFiltersStateParser<WebsiteArchitecturePage>(["page_type", "disposition", "source", "sources"]).withDefault([]),
  joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),
};

export function WebsiteArchitectureTableClient({ businessId }: { businessId: string }) {
  const [state, setState] = useQueryStates(stateParsers, {
    urlKeys: ARCHITECTURE_QUERY_KEYS,
    clearOnDefault: true,
    shallow: true,
  });
  const page = Math.max(1, state.page);
  const perPage = [10, 30, 50, 100, 200].includes(state.perPage) ? state.perPage : 100;
  const signature = JSON.stringify([businessId, perPage, state.search, state.sort, state.filters, state.joinOperator]);
  const previousSignature = React.useRef(signature);
  const needsPageReset = previousSignature.current !== signature && page !== 1;

  React.useEffect(() => {
    if (previousSignature.current === signature) return;
    previousSignature.current = signature;
    void setState({ page: 1 });
  }, [signature, setState]);

  const { fetchWebsiteArchitecture, fetchWebsiteArchitectureExport } = useWebsiteArchitecture();
  const [isDownloadOpen, setIsDownloadOpen] = React.useState(false);
  const query = useQuery({
    queryKey: ["website-architecture", businessId, page, signature],
    queryFn: ({ signal }) => fetchWebsiteArchitecture({ ...state, businessId, page, perPage }, signal),
    enabled: Boolean(businessId) && !needsPageReset,
    staleTime: 1000 * 60 * 5,
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] === businessId ? previous : undefined,
    retry: (failureCount, error) => !isAxiosError(error) || !error.response || error.response.status >= 500
      ? failureCount < 2 : false,
  });

  // A changed page size or a newer run can make a previously valid page disappear.
  React.useEffect(() => {
    if (!query.isPlaceholderData && query.data?.pageCount && page > query.data.pageCount) {
      void setState({ page: 1 });
    }
  }, [page, query.data?.pageCount, query.isPlaceholderData, setState]);

  const typeFilter = state.filters.find((filter) => filter.field === "page_type");
  const quickTypeFilter = getWebPageQuickTypeFilter(
    typeFilter?.operator,
    typeFilter?.value,
  );

  const handleQuickTypeFilter = (value: string) => {
    if (!["all", "editorial", "other"].includes(value)) return;

    const pageTypes = getWebPageTypesForQuickFilter(value as WebPageQuickTypeFilter);
    const filters = state.filters.filter((filter) => filter.field !== "page_type");
    if (pageTypes) {
      filters.push({
        field: "page_type",
        operator: "inArray",
        value: pageTypes,
      });
    }
    void setState({ page: 1, filters });
  };

  const handleDownload = async (format: "csv" | "json", filename: string) => {
    try {
      const payload = await fetchWebsiteArchitectureExport(businessId);
      const pages = payload.pages.output_data?.items ?? [];
      if (!pages.length) throw new Error("There are no pages to download.");
      if (format === "json") downloadWebsiteArchitectureJson(payload, filename);
      else downloadWebsiteArchitectureCsv(pages, filename);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        throw new Error("There are no pages to download.");
      }
      if (
        error instanceof Error &&
        ["Website architecture could not be loaded.", "Website architecture is not ready to download.", "There are no pages to download."].includes(error.message)
      ) {
        throw error;
      }
      throw new Error("Couldn't download website architecture. Please try again.");
    }
  };

  const pending = !query.isError && query.data && ["pending", "processing", "running", "queued", "in_progress"].includes(query.data.status);
  const notFound = query.isError && isAxiosError(query.error) && query.error.response?.status === 404;
  const totalCount = notFound ? 0 : query.data?.totalCount;

  if ((query.isError && !notFound) || pending) {
    return (
      <div role={query.isError ? "alert" : "status"} className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg bg-background p-6 text-center">
        {pending ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : <AlertCircle className="size-6 text-muted-foreground" />}
        <p className="text-sm font-medium">{pending ? "Website architecture is processing" : "Could not load website architecture"}</p>
        <p className="text-sm text-muted-foreground">{pending ? "Check again to see the latest pages." : "Please try again."}</p>
        <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
          {query.isFetching && <Loader2 className="size-4 animate-spin" />}
          {query.isFetching ? "Checking..." : pending ? "Check again" : "Retry"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <p role="status" className="px-4 text-right text-sm font-mono text-general-muted-foreground">
        {totalCount == null ? query.isLoading ? "Loading metrics..." : "" : `${formatVolume(totalCount)} Pages`}
      </p>
      <WebsiteArchitectureTable
        data={notFound ? [] : query.data?.data ?? []}
        pageCount={notFound ? 0 : query.data?.pageCount ?? 0}
        isLoading={query.isLoading || needsPageReset}
        isFetching={query.isFetching || needsPageReset}
        search={state.search}
        onSearchChange={(search) => void setState({ search, page: 1 })}
        quickTypeFilter={quickTypeFilter}
        onQuickTypeFilterChange={handleQuickTypeFilter}
        canDownload={!query.isLoading && !needsPageReset && (totalCount ?? 0) > 0}
        onDownload={() => setIsDownloadOpen(true)}
      />
      <WebsiteArchitectureDownloadDialog
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
        defaultFilename="website-architecture"
        onDownload={handleDownload}
      />
    </div>
  );
}
