"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { AlertCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { useTopicSignals } from "@/hooks/use-topic-signals";
import type { TopicSignalRow } from "@/types/topic-signals-types";
import { useQueryState, parseAsInteger, parseAsString, parseAsJson } from "nuqs";
import type { ExtendedColumnFilter } from "@/types/data-table-types";
import { TopicSignalsSplitView } from "./topic-signals-split-view";
import { TopicSignalsTable } from "./topic-signals-table";

interface TopicSignalsTableClientProps {
  businessId: string;
  onMetricsTextChange?: (text: string) => void;
  onSplitViewChange?: (isSplitView: boolean) => void;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const month = String(index + 1).padStart(2, "0");
  const label = new Date(2000, index, 1).toLocaleDateString("en-US", {
    month: "short",
  });
  return { value: month, label };
});

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const TOPIC_SIGNALS_MIN_YEAR = 2025;

function getYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const startYear = Math.max(TOPIC_SIGNALS_MIN_YEAR, currentYear);
  const years: string[] = [];
  for (let year = startYear; year >= TOPIC_SIGNALS_MIN_YEAR; year--) {
    years.push(String(year));
  }
  return years;
}

function parseMonthYear(value: string): { year: string; month: string } {
  const [year = "", month = ""] = value.split("-");
  return { year, month };
}

function getTriggerErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError;
  const data = axiosError?.response?.data;
  let detail = "";
  if (data && typeof data === "object" && "detail" in data) {
    const value = (data as { detail?: unknown }).detail;
    if (typeof value === "string") detail = value;
  }
  if (/topics workflow run not found/i.test(detail)) {
    return "Generate Topics first. Topic Signals needs a successful Topics run before signals can be generated.";
  }
  return detail || "Topic Signals failed to start. Please retry.";
}

export function TopicSignalsTableClient({
  businessId,
  onMetricsTextChange,
  onSplitViewChange,
}: TopicSignalsTableClientProps) {
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
  const [monthYear, setMonthYear] = useQueryState(
    "signalsMonthYear",
    parseAsString.withDefault("")
  );
  const currentMonthYear = React.useMemo(() => getCurrentMonthYear(), []);
  const selectedMonthYear = monthYear || currentMonthYear;
  const { year: selectedYear, month: selectedMonth } = parseMonthYear(selectedMonthYear);
  const isViewingCurrentMonth = selectedMonthYear === currentMonthYear;
  const yearOptions = React.useMemo(() => getYearOptions(), []);
  const [isSplitView, setIsSplitView] = React.useState(false);
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null);
  const [triggerErrorMessage, setTriggerErrorMessage] = React.useState<string | null>(
    null
  );
  const [isManuallyRegenerating, setIsManuallyRegenerating] = React.useState(false);
  const queryClient = useQueryClient();
  const { fetchTopicSignals, triggerTopicSignals } = useTopicSignals(businessId);
  const queryKey = React.useMemo(
    () => [
      "topic-signals",
      businessId,
      selectedMonthYear,
      page,
      perPage,
      search || "",
      JSON.stringify(sort || []),
      JSON.stringify(filters || []),
      joinOperator || "and",
    ],
    [businessId, filters, joinOperator, page, perPage, search, selectedMonthYear, sort]
  );

  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchTopicSignals({
        page,
        pageSize: perPage,
        search: search || undefined,
        sort: sort || [],
        filters: filters || [],
        joinOperator: (joinOperator || "and") as "and" | "or",
        monthYear: isViewingCurrentMonth ? undefined : selectedMonthYear,
      }),
    enabled: Boolean(businessId),
    placeholderData: (previousData) => previousData,
    refetchInterval: (query) => {
      const dataStatus = query.state.data?.status;
      return isManuallyRegenerating || dataStatus === "pending" || dataStatus === "processing"
        ? 3000
        : false;
    },
  });

  const mutation = useMutation({
    mutationFn: () => triggerTopicSignals(),
    onMutate: () => {
      setTriggerErrorMessage(null);
    },
    onSuccess: () => {
      setTriggerErrorMessage(null);
      setIsManuallyRegenerating(true);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ["topic-signals", businessId] });
    },
    onError: (error) => {
      setIsManuallyRegenerating(false);
      setTriggerErrorMessage(getTriggerErrorMessage(error));
    },
  });

  const status = query.data?.status;

  React.useEffect(() => {
    if (isManuallyRegenerating && (status === "success" || status === "error" || status === "not_found")) {
      setIsManuallyRegenerating(false);
    }
  }, [isManuallyRegenerating, status]);
  const rows: TopicSignalRow[] = query.data?.output_data?.items || [];
  const metrics = query.data?.output_data?.metrics?.[0];
  const pagination = query.data?.output_data?.pagination;
  const pageCount = pagination?.total_pages || 1;
  const isMissingPrerequisite = Boolean(query.data?.missingPrerequisite);
  const isNotGenerated =
    Boolean(query.data?.isNotFound || status === "not_found") && !isMissingPrerequisite;
  const isWorkflowError = status === "error";
  const isGenerated = status === "success" && !isMissingPrerequisite && !isNotGenerated;
  const isRequestError = query.isError;
  const isStatusLoading = query.isLoading || query.isFetching || (!query.data && !query.isError);
  const canRunSignalsAction =
    isViewingCurrentMonth &&
    !isStatusLoading &&
    !isMissingPrerequisite &&
    (isNotGenerated || isWorkflowError || isGenerated);
  const isRegenerateAction = isGenerated && !isWorkflowError && !isNotGenerated;
  const isGenerating =
    isManuallyRegenerating || status === "pending" || status === "processing" || mutation.isPending;
  const isInitialLoading = query.isLoading && !query.data;
  const workflowErrorMessage =
    query.data?.output_data?.errors?.[0] || "Topic Signals failed. Please retry.";
  const requestErrorMessage =
    query.error instanceof Error
      ? query.error.message
      : "Unable to load Topic Signals. Please retry.";

  React.useEffect(() => {
    if (!onMetricsTextChange) return;
    if (query.isLoading && !query.data) {
      onMetricsTextChange("Loading topic signals...");
      return;
    }
    if (isRequestError) {
      onMetricsTextChange("Topic Signals unavailable");
      return;
    }
    if (isMissingPrerequisite) {
      onMetricsTextChange("Topic Signals: generate Topics first");
      return;
    }
    if (isNotGenerated) {
      onMetricsTextChange("Topic Signals: not generated");
      return;
    }
    if (status === "pending" || status === "processing") {
      onMetricsTextChange("Topic Signals: generating");
      return;
    }
    onMetricsTextChange(`${metrics?.total_signals ?? rows.length} Topic Signals`);
  }, [
    isMissingPrerequisite,
    isNotGenerated,
    isRequestError,
    metrics?.total_signals,
    onMetricsTextChange,
    query.data,
    query.isLoading,
    rows.length,
    selectedMonthYear,
    status,
  ]);

  const applyMonthYear = React.useCallback(
    (year: string, month: string) => {
      const combined = `${year}-${month}`;
      void setMonthYear(combined === currentMonthYear ? "" : combined);
      void setPage(1);
    },
    [currentMonthYear, setMonthYear, setPage]
  );

  const handleMonthSelect = React.useCallback(
    (month: string) => {
      applyMonthYear(selectedYear, month);
    },
    [applyMonthYear, selectedYear]
  );

  const handleYearSelect = React.useCallback(
    (year: string) => {
      applyMonthYear(year, selectedMonth);
    },
    [applyMonthYear, selectedMonth]
  );

  const evaluationMonthLabel =
    query.data?.metadata?.evaluation_month || selectedMonthYear;

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
      variant={canRunSignalsAction && !isRegenerateAction ? "default" : "outline"}
      size="sm"
      disabled={!canRunSignalsAction || isGenerating}
      onClick={() => mutation.mutate()}
    >
      {isGenerating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : canRunSignalsAction && (isWorkflowError || isRegenerateAction) ? (
        <RefreshCw className="mr-2 h-4 w-4" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      {mutation.isPending && isRegenerateAction
        ? "Regenerating Signals"
        : mutation.isPending
          ? "Generating Signals"
          : isWorkflowError
            ? "Retry Signals"
            : isRegenerateAction
              ? "Regenerate Signals"
              : "Generate Signals"}
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
            </div>
            <Typography variant="p" className="text-sm text-general-muted-foreground">
              Rising, seasonal, and breakout labels for topics that pass the precision gate.
              {!isViewingCurrentMonth ? ` Viewing ${evaluationMonthLabel}.` : null}
            </Typography>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedMonth} onValueChange={handleMonthSelect}>
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={handleYearSelect}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isViewingCurrentMonth ? toolbarAction : null}
          </div>
        </div>
      </div>

      {triggerErrorMessage ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <Typography variant="p" className="text-sm text-destructive">
            {triggerErrorMessage}
          </Typography>
        </div>
      ) : null}

      {isInitialLoading ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
          <TopicSignalsPanelState
            icon={<Loader2 className="h-7 w-7 animate-spin text-general-primary" />}
            title="Loading topic signals"
            description="Checking whether topic signals are already generated."
          />
        </div>
      ) : isGenerating ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
          <TopicSignalsPanelState
            icon={<Loader2 className="h-7 w-7 animate-spin text-general-primary" />}
            title={isRegenerateAction ? "Regenerating topic signals" : "Generating topic signals"}
            description="We are analyzing trend, seasonality, and growth signals. This view refreshes automatically every few seconds."
          />
        </div>
      ) : isRequestError ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
          <TopicSignalsPanelState
            icon={<AlertCircle className="h-8 w-8 text-destructive" />}
            title="Unable to load Topic Signals"
            description={requestErrorMessage}
            action={
              <Button variant="outline" size="sm" onClick={() => query.refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            }
          />
        </div>
      ) : isMissingPrerequisite ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
          <TopicSignalsPanelState
            icon={<AlertCircle className="h-8 w-8 text-general-muted-foreground" />}
            title="Generate Topics first"
            description="Topic Signals needs a successful Topics run before signals can be generated."
          />
        </div>
      ) : isWorkflowError ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
          <TopicSignalsPanelState
            icon={<AlertCircle className="h-8 w-8 text-destructive" />}
            title="Topic Signals failed"
            description={workflowErrorMessage}
            action={isViewingCurrentMonth ? toolbarAction : undefined}
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
          <TopicSignalsPanelState
            icon={<Sparkles className="h-8 w-8 text-general-muted-foreground" />}
            title={isNotGenerated ? "No signals generated yet" : "No topic signals found"}
            description={
              isNotGenerated
                ? isViewingCurrentMonth
                  ? "Generate signals to identify rising, seasonal, and breakout topics."
                  : `No signals were generated for ${evaluationMonthLabel}.`
                : "No topics passed the precision gate."
            }
            action={isViewingCurrentMonth && (isNotGenerated || isGenerated) ? toolbarAction : undefined}
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
          toolbarRightPrefix={isViewingCurrentMonth ? toolbarAction : undefined}
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
