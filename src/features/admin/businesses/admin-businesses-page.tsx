"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminBusinesses } from "../api/admin-api";
import { AdminPageHeader } from "../components/admin-page-header";
import { AdminErrorState, AdminPageLoading } from "../components/admin-states";
import { AdminBusinessTable } from "./admin-business-table";
import { useDebounce } from "@/hooks/use-debounce";

export function AdminBusinessesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", "businesses", debouncedSearch, status, page],
    queryFn: () =>
      getAdminBusinesses({
        search: debouncedSearch,
        status: status === "all" ? undefined : status,
        page,
        pageSize: 25,
        sort: "name",
      }),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });
  if (query.isLoading && !query.data) return <AdminPageLoading />;
  if (query.isError || !query.data?.data)
    return (
      <AdminErrorState
        message={query.error?.message}
        onRetry={() => query.refetch()}
        pending={query.isFetching}
      />
    );
  const data = query.data.data;
  const tableBusy = search !== debouncedSearch || query.isFetching;
  const formatRangeDate = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year:
        data.analyticsRange.start.slice(0, 4) ===
        data.analyticsRange.end.slice(0, 4)
          ? undefined
          : "numeric",
    }).format(new Date(`${value}T00:00:00`));
  return (
    <div className="mx-auto flex h-[calc(100dvh-52px-2rem)] w-full min-w-0 max-w-[1500px] flex-col overflow-hidden sm:h-[calc(100dvh-52px-2.5rem)] lg:h-[calc(100dvh-52px-3.5rem)]">
      <div className="shrink-0">
        <AdminPageHeader
          title="Businesses"
          description="Search every Massic business and open its read-only performance snapshot."
        />
      </div>
      <div className="admin-toolbar mb-3 flex w-full min-w-0 max-w-full shrink-0 flex-col gap-2 overflow-hidden rounded-lg border p-2 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative w-full max-w-[360px]">
            {search !== debouncedSearch ? (
              <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-general-primary" />
            ) : (
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-general-primary" />
            )}
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="h-9 rounded-lg border-general-border bg-white/90 pl-9 transition-colors hover:border-general-primary/35"
              placeholder="Search business, website, or agency"
              aria-label="Search businesses"
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 min-w-[140px] rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["all", "strong", "dip", "check", "no_signal"].map((value) => (
                <SelectItem key={value} value={value}>
                  {value === "all"
                    ? "All signals"
                    : value
                        .replace("_", " ")
                        .replace(/^./, (char) => char.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-1 text-xs text-general-muted-foreground">
          <span className="shrink-0">
            {data.total.toLocaleString()} businesses
          </span>
          <span
            className="inline-flex min-w-0 max-w-full items-start gap-1.5"
            title="Clicks and impressions use the latest 28 finalized analytics days."
          >
            <CalendarRange className="mt-px size-3.5 shrink-0 text-general-primary" />
            <span className="min-w-0 break-words">
              Clicks &amp; impressions · {formatRangeDate(data.analyticsRange.start)}–
              {formatRangeDate(data.analyticsRange.end)} · {data.analyticsRange.days} finalized days
            </span>
          </span>
        </div>
      </div>
      <div
        className="relative min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden"
        aria-busy={tableBusy}
      >
        <AdminBusinessTable rows={data.rows} viewportScroll />
        {tableBusy && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/55 backdrop-blur-[1px]"
            role="status"
            aria-live="polite"
          >
            <span className="admin-panel flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-general-muted-foreground shadow-xs">
              <Loader2 className="size-3.5 animate-spin text-general-primary" />
              Updating businesses…
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 flex shrink-0 items-center justify-between text-xs text-general-muted-foreground">
        <span>
          Page {data.page} of {Math.max(1, data.pageCount)}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={page <= 1 || query.isFetching}
            onClick={() => setPage((value) => value - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={page >= data.pageCount || query.isFetching}
            onClick={() => setPage((value) => value + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
