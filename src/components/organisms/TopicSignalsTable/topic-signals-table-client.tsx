"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Typography } from "@/components/ui/typography";
import { useTopicSignals } from "@/hooks/use-topic-signals";
import type { TopicSignalRow } from "@/types/topic-signals-types";
import { useQueryState, parseAsInteger, parseAsString, parseAsJson } from "nuqs";
import type { ExtendedColumnFilter } from "@/types/data-table-types";
import { TopicSignalsSplitView } from "./topic-signals-split-view";
import { TopicSignalsTable } from "./topic-signals-table";

interface TopicSignalsTableClientProps {
  businessId: string;
  monthYear?: string;
  onMetricsTextChange?: (text: string) => void;
  onSplitViewChange?: (isSplitView: boolean) => void;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function TopicSignalsTableClient({
  businessId,
  monthYear,
  onMetricsTextChange,
  onSplitViewChange,
}: TopicSignalsTableClientProps) {
  const month = monthYear || currentMonth();
  const [page, setPage] = useQueryState("signalsPage", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("signalsPerPage", parseAsInteger.withDefault(100));
  const [search, setSearch] = useQueryState("signalsSearch", parseAsString.withDefault(""));
  const [sort] = useQueryState(
    "signalsSort",
    parseAsJson<Array<{ field: string; desc: boolean }>>((value) =>
      Array.isArray(value) ? (value as Array<{ field: string; desc: boolean }>) : null
    ).withDefault([])
  );
  const [filters] = useQueryState(
    "signalsFilters",
    parseAsJson<ExtendedColumnFilter<TopicSignalRow>[]>((value) =>
      Array.isArray(value) ? (value as ExtendedColumnFilter<TopicSignalRow>[]) : null
    ).withDefault([])
  );
  const [joinOperator] = useQueryState(
    "signalsJoinOperator",
    parseAsString.withDefault("and")
  );
  const [isSplitView, setIsSplitView] = React.useState(false);
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null);
  const queryClient = useQueryClient();
  const { fetchTopicSignals, triggerTopicSignals } = useTopicSignals(businessId);
  const queryKey = React.useMemo(
    () => [
      "topic-signals",
      businessId,
      month,
      page,
      perPage,
      search || "",
      JSON.stringify(sort || []),
      JSON.stringify(filters || []),
      joinOperator || "and",
    ],
    [businessId, filters, joinOperator, month, page, perPage, search, sort]
  );

  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchTopicSignals({
        monthYear: month,
        page,
        pageSize: perPage,
        search: search || undefined,
        sort: sort || [],
        filters: filters || [],
        joinOperator: (joinOperator || "and") as "and" | "or",
      }),
    enabled: Boolean(businessId),
    placeholderData: (previousData) => previousData,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 5000 : false;
    },
  });

  const mutation = useMutation({
    mutationFn: () => triggerTopicSignals(month),
    onSuccess: () => {
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ["topic-signals", businessId, month] });
    },
  });

  const status = query.data?.status;
  const rows: TopicSignalRow[] = query.data?.output_data?.items || [];
  const metrics = query.data?.output_data?.metrics?.[0];
  const pagination = query.data?.output_data?.pagination;
  const pageCount = pagination?.total_pages || 1;
  const isStatusLoading = query.isLoading || query.isFetching || !query.data;
  const canGenerate =
    !isStatusLoading && (status === "not_found" || status === "error");
  const isGenerating =
    status === "pending" || status === "processing" || mutation.isPending;
  const isInitialLoading = query.isLoading && !query.data;
  const errorMessage =
    query.data?.output_data?.errors?.[0] || "Topic Signals failed. Please retry.";

  React.useEffect(() => {
    if (!onMetricsTextChange) return;
    if (query.isLoading) {
      onMetricsTextChange("Loading topic signals...");
      return;
    }
    if (status === "not_found") {
      onMetricsTextChange(`Topic Signals: ${month} not generated`);
      return;
    }
    if (status === "pending" || status === "processing") {
      onMetricsTextChange(`Topic Signals: generating ${month}`);
      return;
    }
    onMetricsTextChange(
      `${metrics?.total_signals ?? rows.length} Topic Signals for ${month}`
    );
  }, [metrics?.total_signals, month, onMetricsTextChange, query.isLoading, rows.length, status]);

  const handleRowClick = React.useCallback((row: TopicSignalRow) => {
    setSelectedRowId(String(row.id));
    setIsSplitView(true);
    onSplitViewChange?.(true);
  }, [onSplitViewChange]);

  if (isSplitView) {
    return (
      <TopicSignalsSplitView
        rows={rows}
        selectedRowId={selectedRowId}
        onRowSelect={setSelectedRowId}
        onBack={() => {
          setIsSplitView(false);
          onSplitViewChange?.(false);
        }}
        pageCount={pageCount}
      />
    );
  }

  const toolbarAction = (
    <Button
      variant={canGenerate ? "default" : "outline"}
      size="sm"
      disabled={!canGenerate || isGenerating}
      onClick={() => mutation.mutate()}
    >
      {isGenerating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : canGenerate && status === "error" ? (
        <RefreshCw className="mr-2 h-4 w-4" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      {status === "error" ? "Retry Signals" : "Generate Signals"}
    </Button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-general-primary" />
              <Typography variant="h4">Topic Signals</Typography>
              <Badge variant="secondary" className="font-mono text-[10.4px]">
                {month}
              </Badge>
            </div>
            <Typography variant="p" className="text-sm text-general-muted-foreground">
              Monthly rising, seasonal, and breakout labels for topics that pass the precision gate.
            </Typography>
          </div>
          {toolbarAction}
        </div>
      </div>

      {isInitialLoading ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
          <TopicSignalsPanelState
            icon={<Loader2 className="h-7 w-7 animate-spin text-general-primary" />}
            title="Loading topic signals"
            description="Checking whether this month already has generated signals."
          />
        </div>
      ) : isGenerating ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
          <TopicSignalsPanelState
            icon={<Loader2 className="h-7 w-7 animate-spin text-general-primary" />}
            title="Generating topic signals"
            description="We are analyzing trend, seasonality, and growth signals. This view refreshes automatically every few seconds."
          />
        </div>
      ) : status === "error" ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
          <TopicSignalsPanelState
            icon={<AlertCircle className="h-8 w-8 text-destructive" />}
            title="Topic Signals failed"
            description={errorMessage}
            action={toolbarAction}
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
          <TopicSignalsPanelState
            icon={<Sparkles className="h-8 w-8 text-general-muted-foreground" />}
            title={status === "not_found" ? "No signals generated yet" : "No topic signals found"}
            description={
              status === "not_found"
                ? "Generate monthly signals to identify rising, seasonal, and breakout topics."
                : "This month did not surface any topics that passed the precision gate."
            }
            action={status === "not_found" ? toolbarAction : undefined}
          />
        </div>
      ) : (
        <TopicSignalsTable
          data={rows}
          pageCount={pageCount}
          isLoading={isInitialLoading}
          isFetching={query.isFetching}
          search={search}
          onSearchChange={setSearch}
          onRowClick={handleRowClick}
          toolbarRightPrefix={toolbarAction}
        />
      )}
    </div>
  );
}

function TopicSignalsPanelState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      {icon}
      <div className="flex flex-col gap-1">
        <Typography variant="h4">{title}</Typography>
        <Typography variant="p" className="max-w-md text-sm text-general-muted-foreground">
          {description}
        </Typography>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
