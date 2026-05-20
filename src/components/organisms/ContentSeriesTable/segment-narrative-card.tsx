"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { Typography } from "@/components/ui/typography";
import type { ContentSeriesRow } from "@/types/content-series-types";
import {
  SEGMENT_NARRATIVE_QUERY_KEY,
  isSegmentNarrativeNotFound,
  useSegmentNarrativeActions,
  useSegmentNarrativeContentQuery,
  type SegmentNarrativeResponse,
} from "@/hooks/use-segment-narrative";
import { ArrowLeft, Eye, Sparkles } from "lucide-react";

function getStatusLowercase(value: unknown): string {
  return (value || "").toString().toLowerCase();
}

function getErrorMessage(error: unknown): string {
  const anyError = error as any;
  const responseMessage =
    anyError?.response?.data?.message ||
    anyError?.response?.data?.detail ||
    anyError?.response?.data?.error;
  if (typeof responseMessage === "string" && responseMessage.trim()) return responseMessage;
  if (error instanceof Error) return error.message;
  return anyError?.message || "An error occurred";
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ");
}

function getNarrativePayload(data: SegmentNarrativeResponse | null | undefined): Record<string, any> | null {
  const output = data?.output_data;
  if (!output || typeof output !== "object") return null;

  const candidates = [
    output.segment_narrative,
    output.narrative,
    output.content,
    output.segment,
  ];

  const nested = candidates.find((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate));
  if (nested) return nested as Record<string, any>;

  return output;
}

function renderValue(value: unknown): React.ReactNode {
  if (value == null || value === "") {
    return <Typography variant="p" className="text-muted-foreground">-</Typography>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <Typography variant="p" className="text-muted-foreground">-</Typography>;

    return (
      <div className="flex flex-col gap-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-md border border-general-border-three bg-background p-3">
            {typeof item === "object" && item !== null ? (
              <NarrativeFields data={item as Record<string, any>} />
            ) : (
              <Typography variant="p" className="text-sm">{String(item)}</Typography>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    return <NarrativeFields data={value as Record<string, any>} />;
  }

  return <Typography variant="p" className="text-sm whitespace-pre-wrap">{String(value)}</Typography>;
}

function NarrativeFields({ data }: { data: Record<string, any> }) {
  const entries = Object.entries(data).filter(([key]) => !["id", "business_id", "content_series_id"].includes(key));

  if (entries.length === 0) {
    return <Typography variant="p" className="text-muted-foreground">No narrative content available.</Typography>;
  }

  return (
    <div className="flex flex-col gap-4">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col gap-1.5">
          <span className="font-mono text-[12px] font-normal capitalize leading-normal text-general-muted-foreground">
            {humanizeKey(key)}
          </span>
          {renderValue(value)}
        </div>
      ))}
    </div>
  );
}

function TagsSection({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-md bg-foreground-light border border-background p-3 flex items-start gap-6">
      <div className="flex flex-col gap-1 shrink-0 w-28">
        <span className="font-mono text-[12px] font-normal leading-normal text-general-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {values.length > 0 ? (
          values.map((value) => (
            <Badge
              key={value}
              variant="outline"
              className="bg-background shrink-0 rounded-md border-general-border px-2 py-[3px] min-h-6 text-[10px] font-medium capitalize tracking-[0.15px] text-general-muted-foreground"
            >
              {value}
            </Badge>
          ))
        ) : (
          <Typography variant="p" className="text-sm text-muted-foreground">
            -
          </Typography>
        )}
      </div>
    </div>
  );
}

interface SegmentNarrativeCardProps {
  businessId: string;
  row: ContentSeriesRow;
}

export function SegmentNarrativeCard({ businessId, row }: SegmentNarrativeCardProps) {
  const [starting, setStarting] = React.useState(false);
  const [pollingDisabled, setPollingDisabled] = React.useState(false);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { startGeneration } = useSegmentNarrativeActions();

  const contentQuery = useSegmentNarrativeContentQuery({
    businessId,
    contentSeriesId: row.id,
    enabled: !!businessId && !!row.id,
    pollingDisabled,
    pollingIntervalMs: 6000,
  });

  const statusFromRow = getStatusLowercase(row.status);
  const statusFromContent = getStatusLowercase(contentQuery.data?.status);
  const status = statusFromContent || statusFromRow;
  const isNotFound =
    contentQuery.data === null ||
    (contentQuery.isError && isSegmentNarrativeNotFound(contentQuery.error));
  const isGenerating = starting || status === "pending" || status === "processing";
  const narrativePayload = getNarrativePayload(contentQuery.data);
  const showViewButton = !isNotFound && !isGenerating && (!!contentQuery.data || status === "success");

  const updateRowStatus = React.useCallback(
    (nextStatus: string) => {
      queryClient.setQueriesData(
        { queryKey: ["content-series", businessId] },
        (oldData: any) => {
          if (!oldData || !Array.isArray(oldData.data)) return oldData;
          const nextRows = (oldData.data as ContentSeriesRow[]).map((contentRow) => {
            if (contentRow.id !== row.id) return contentRow;
            return { ...contentRow, status: nextStatus };
          });
          return { ...oldData, data: nextRows };
        }
      );
    },
    [businessId, queryClient, row.id]
  );

  React.useEffect(() => {
    if (status === "success") {
      updateRowStatus("success");
    }
  }, [status, updateRowStatus]);

  React.useEffect(() => {
    if (status !== "pending" && status !== "processing") {
      setPollingDisabled(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setPollingDisabled(true);
      toast.warning("Generation seems to be stuck. Please try again.");
    }, 300000);

    return () => window.clearTimeout(timeout);
  }, [status]);

  const handleGenerate = React.useCallback(async () => {
    if (starting) return;
    setStarting(true);

    try {
      queryClient.setQueryData(
        [SEGMENT_NARRATIVE_QUERY_KEY, businessId, row.id],
        { status: "pending" }
      );
      updateRowStatus("pending");
      const response = await startGeneration(businessId, row.id);
      const nextStatus = getStatusLowercase(response?.status) || "pending";
      queryClient.setQueryData(
        [SEGMENT_NARRATIVE_QUERY_KEY, businessId, row.id],
        { ...response, status: nextStatus }
      );
      updateRowStatus(nextStatus);
      await contentQuery.refetch();
      toast.success("Segment narrative generation started.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setStarting(false);
    }
  }, [businessId, contentQuery, queryClient, row.id, startGeneration, starting, updateRowStatus]);

  const handleView = React.useCallback(() => {
    setPanelOpen(true);
  }, []);

  if (panelOpen) {
    return (
      <div className="bg-background border border-general-border flex flex-col gap-6 overflow-hidden p-6 rounded-xl w-full">
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPanelOpen(false)}
            className="h-9 px-4 rounded-xl gap-2 text-general-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {contentQuery.isLoading ? (
          <div className="rounded-lg border border-general-border-three bg-foreground-light p-6 text-center">
            <Typography variant="p" className="text-muted-foreground">Loading narrative...</Typography>
          </div>
        ) : contentQuery.isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <Typography variant="p" className="mb-4 text-destructive">
              {getErrorMessage(contentQuery.error)}
            </Typography>
            <Button type="button" variant="outline" onClick={() => contentQuery.refetch()}>
              Try Again
            </Button>
          </div>
        ) : narrativePayload ? (
          <div className="rounded-lg border border-general-border-three bg-foreground-light p-4">
            <NarrativeFields data={narrativePayload} />
          </div>
        ) : (
          <div className="rounded-lg border border-general-border-three bg-foreground-light p-6 text-center">
            <Eye className="h-5 w-5 mx-auto mb-3 text-general-muted-foreground" />
            <Typography variant="p" className="text-muted-foreground">
              No narrative content available.
            </Typography>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-background border border-general-border flex flex-col gap-6 overflow-hidden p-6 rounded-xl w-full">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Typography variant="h3" className="truncate">
              {row.title || "Untitled content series"}
            </Typography>
            <Typography variant="p" className="text-sm text-muted-foreground capitalize">
              {row.cluster_name}
            </Typography>
          </div>
          {row.intent && (
            <Badge variant="outline" className="capitalize shrink-0">
              {row.intent}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-general-muted-foreground">priority</span>
            <RelevancePill score={row.final_score} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-general-muted-foreground">relevance</span>
            <RelevancePill score={row.br_score} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <TagsSection label="signals" values={row.signals} />
        <TagsSection label="tensions" values={row.tensions} />
      </div>

      <div className="flex justify-center">
        {isGenerating ? (
          <Button className="gap-2" type="button" disabled>
            <Sparkles className="h-4 w-4" />
            Generating...
          </Button>
        ) : showViewButton ? (
          <Button className="gap-2" type="button" variant="outline" onClick={handleView}>
            <Eye className="h-4 w-4" />
            View
          </Button>
        ) : (
          <Button
            className="gap-2"
            type="button"
            onClick={handleGenerate}
            disabled={starting || (contentQuery.isLoading && !contentQuery.data)}
          >
            <Sparkles className="h-4 w-4" />
            {contentQuery.isLoading && !contentQuery.data ? "Loading..." : "Generate"}
          </Button>
        )}
      </div>
    </div>
  );
}
