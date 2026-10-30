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
import type { WebsiteArchitecturePage } from "@/types/website-architecture-types";
import { ARCHITECTURE_QUERY_KEYS, WebsiteArchitectureTable } from "./website-architecture-table";

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

  const { fetchWebsiteArchitecture } = useWebsiteArchitecture();
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
  const typeValues = typeFilter ? (Array.isArray(typeFilter.value) ? typeFilter.value : [typeFilter.value]) : [];
  const quickTypeFilter = !typeFilter ? "all"
    : typeValues.length === 1 && typeValues[0] === "editorial"
      ? typeFilter.operator === "ne" ? "other" : ["eq", "inArray"].includes(typeFilter.operator) ? "blog" : "custom"
      : "custom";

  const handleQuickTypeFilter = (value: string) => {
    if (!["all", "blog", "other"].includes(value)) return;
    const filters = state.filters.filter((filter) => filter.field !== "page_type");
    if (value !== "all") {
      filters.push({
        field: "page_type",
        operator: value === "blog" ? "inArray" : "ne",
        value: value === "blog" ? ["editorial"] : "editorial",
      });
    }
    void setState({ page: 1, filters });
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
        negativeTypeFilter={typeFilter?.operator === "ne"}
        onQuickTypeFilterChange={handleQuickTypeFilter}
      />
    </div>
  );
}
