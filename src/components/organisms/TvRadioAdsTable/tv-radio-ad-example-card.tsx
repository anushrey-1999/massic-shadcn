"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Eye, FileCheck, Lightbulb, MessageCircleWarning, Puzzle, Sparkles } from "lucide-react";
import type { TvRadioAdConceptRow } from "@/types/tv-radio-ads-types";
import {
  useAdConceptWriterActions,
  useAdConceptWriterContentQuery,
  type AdConceptWriterResponse,
} from "@/hooks/use-ad-concept-writer";

function getStatusLowercase(value: unknown): string {
  return (value || "").toString().toLowerCase();
}

type WriterSuccessContent = {
  title: string;
  storyBeats: string[];
  insight: string;
};

function extractWriterSuccessContent(data: AdConceptWriterResponse | undefined): WriterSuccessContent | null {
  const writer = (data?.output_data as any)?.ad_concept_writer_content;
  if (!writer || typeof writer !== "object") return null;

  const title = typeof writer.title === "string" ? writer.title : "";
  const storyBeatsFromTv = Array.isArray(writer.story_beats)
    ? (writer.story_beats.filter((b: any) => typeof b === "string") as string[])
    : [];
  const storyBeatsFromRadio = Array.isArray(writer.script_outline)
    ? (writer.script_outline.filter((b: any) => typeof b === "string") as string[])
    : [];
  const storyBeats = storyBeatsFromTv.length > 0 ? storyBeatsFromTv : storyBeatsFromRadio;
  const insight = typeof writer.insight === "string" ? writer.insight : "";

  if (!title && storyBeats.length === 0 && !insight) return null;
  return {
    title,
    storyBeats,
    insight,
  };
}

function WriterSuccessViewCard({
  content,
  onBack,
}: {
  content: WriterSuccessContent;
  onBack: () => void;
}) {
  return (
    <div className="bg-background border border-general-border flex flex-col gap-6 items-start overflow-hidden p-6 rounded-xl w-full">
      <div className="w-full">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          className="h-9 px-4 rounded-xl gap-2 text-general-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <p className="text-[20px] font-semibold leading-[1.2] tracking-[-0.4px] text-general-foreground">
        {content.title || "Untitled"}
      </p>

      <div className="flex flex-col items-start">
        {content.storyBeats.map((beat, index) => (
          <React.Fragment key={`${index}-${beat.slice(0, 24)}`}>
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full border border-general-border-three flex items-center justify-center shrink-0">
                <span className="font-mono text-[12px] font-normal leading-normal text-general-muted-foreground">
                  {index + 1}
                </span>
              </div>
              <p className="text-[12px] font-medium leading-normal tracking-[0.18px] text-general-foreground">
                {beat}
              </p>
            </div>
            {index < content.storyBeats.length - 1 ? (
              <div className="h-6 w-8 relative shrink-0">
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-general-border-three" />
              </div>
            ) : null}
          </React.Fragment>
        ))}
      </div>

      <div className="w-full">
        <div className="bg-blue-50 border border-blue-500 flex items-center gap-6 p-3 rounded-xl w-full">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="font-mono text-[12px] font-normal leading-normal text-blue-500">
              data insight
            </span>
            <p className="text-[12px] font-normal leading-normal tracking-[0.18px] text-general-foreground">
              {content.insight || ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniBarsIcon({ className }: { className?: string }) {
  return (
    <div className={cn("h-2.5 w-[9px] flex items-end gap-px", className)}>
      <div className="w-0.5 h-1 rounded-[1px] bg-chart-static-green" />
      <div className="w-0.5 h-1.5 rounded-[1px] bg-chart-static-green" />
      <div className="w-0.5 h-2 rounded-[1px] bg-chart-static-green" />
      <div className="w-0.5 h-2.5 rounded-[1px] bg-chart-static-green" />
    </div>
  );
}

function MetricTile({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex-1 min-w-0 self-stretch rounded-md border border-general-border-three p-3 flex items-center gap-6", className)}>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="font-mono text-[12px] font-normal leading-normal text-general-muted-foreground">
          {label}
        </span>
        {children}
      </div>
    </div>
  );
}

function Section({
  label,
  title,
  icon: Icon,
  chips,
  className,
}: {
  label: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  chips: string[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md bg-foreground-light border border-background p-3 flex items-start gap-6",
        className,
      )}
    >
      <div className="flex flex-col gap-1 shrink-0 w-28">
        <div className="flex items-center gap-1 text-general-muted-foreground">
          <Icon className="h-4 w-4 text-general-muted-foreground" />
          <span className="font-mono text-[12px] font-normal leading-normal text-general-muted-foreground">
            {label}
          </span>
        </div>
        <span className="text-[12px] font-medium leading-normal tracking-[0.18px] text-general-foreground">
          {title}
        </span>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {chips.map((chip) => (
          <Badge
            key={chip}
            variant="outline"
            className="bg-background shrink-0 rounded-md border-general-border px-2 py-[3px] min-h-6 text-[10px] font-medium tracking-[0.15px] text-general-muted-foreground"
          >
            {chip}
          </Badge>
        ))}

      </div>
    </div>
  );
}

export function TvRadioAdExampleCard({
  businessId,
  row,
}: {
  businessId: string;
  row: TvRadioAdConceptRow;
}) {
  const queryClient = useQueryClient();
  const { startGeneration } = useAdConceptWriterActions();

  const problemTitle = row.problem_head_term || row.subtopic || "";
  const solutionTitle = row.solution_head_term || "";

  const hasProof = (row.proof_head_term && row.proof_head_term.trim().length > 0) || row.proof_keywords.length > 0;
  const hasAction = (row.action_head_term && row.action_head_term.trim().length > 0) || row.action_keywords.length > 0;

  const adConceptId = row.id;
  const [starting, setStarting] = React.useState(false);
  const [justGenerated, setJustGenerated] = React.useState(false);
  const [pollingDisabled, setPollingDisabled] = React.useState(false);
  const lastStatusRef = React.useRef<string>("");

  const [panelOpen, setPanelOpen] = React.useState(false);

  const contentQuery = useAdConceptWriterContentQuery({
    businessId,
    adConceptId,
    enabled: !!businessId && !!adConceptId,
    pollingDisabled,
    pollingIntervalMs: 6000,
  });

  const statusFromRow = getStatusLowercase(row.status);
  const statusFromContent = getStatusLowercase(contentQuery.data?.status);
  const status = statusFromContent || statusFromRow;

  const initialStatusLoading = !contentQuery.data && !contentQuery.error && (contentQuery.isLoading || contentQuery.isFetching);
  const isGenerating = status === "pending" || status === "processing";
  const isSuccess = status === "success";

  const showGeneratingView = isGenerating || starting;
  const showViewButton = isSuccess;
  const showGenerateButton = !showViewButton && !showGeneratingView;

  React.useEffect(() => {
    const prevStatus = lastStatusRef.current;
    if (prevStatus === status) return;
    lastStatusRef.current = status;

    if (status === "success") {
      queryClient.setQueriesData(
        { queryKey: ["tv-radio-ads", businessId] },
        (oldData: any) => {
          if (!oldData || !Array.isArray(oldData.data)) return oldData;
          const nextRows = (oldData.data as TvRadioAdConceptRow[]).map((r) => {
            if (r.id !== adConceptId) return r;
            return { ...r, status: "success" };
          });
          return { ...oldData, data: nextRows };
        }
      );

      queryClient.invalidateQueries({ queryKey: ["tv-radio-ads", businessId] });
    }

    if (status !== "pending") {
      setPollingDisabled(false);
    }
  }, [status, queryClient, businessId, adConceptId]);

  React.useEffect(() => {
    if (status !== "pending") return;

    const timeout = window.setTimeout(() => {
      setPollingDisabled(true);
      toast.warning("Generation seems to be stuck. Please try again.");
    }, 300000);

    return () => window.clearTimeout(timeout);
  }, [status]);

  const handleOpenPanel = React.useCallback(() => {
    setPanelOpen(true);
  }, []);

  const handleGenerate = React.useCallback(async () => {
    if (!businessId || !adConceptId) {
      toast.error("Missing business id or ad concept id");
      return;
    }

    if (starting) return;
    setPanelOpen(true);
    setStarting(true);
    setJustGenerated(true);

    try {
      const response = await startGeneration(businessId, adConceptId);
      const startedStatus = getStatusLowercase(response?.status) || "pending";

      queryClient.setQueriesData(
        { queryKey: ["tv-radio-ads", businessId] },
        (oldData: any) => {
          if (!oldData || !Array.isArray(oldData.data)) return oldData;
          const nextRows = (oldData.data as TvRadioAdConceptRow[]).map((r) => {
            if (r.id !== adConceptId) return r;
            return { ...r, status: startedStatus };
          });
          return { ...oldData, data: nextRows };
        }
      );

      toast.success("Ad generation started.");
    } catch (error: any) {
      if (error?.response?.status === 403) {
        toast.error("You need more execution credits to generate ads.");
      } else {
        toast.error("Failed to start generation.");
      }
    } finally {
      setStarting(false);
      contentQuery.refetch();
    }
  }, [adConceptId, businessId, contentQuery, queryClient, startGeneration, starting]);

  React.useEffect(() => {
    if (justGenerated && !isGenerating && status === "success") {
      setJustGenerated(false);
    }
  }, [justGenerated, isGenerating, status]);

  const successContent = extractWriterSuccessContent(contentQuery.data);

  if (panelOpen && showViewButton) {
    return successContent ? (
      <WriterSuccessViewCard content={successContent} onBack={() => setPanelOpen(false)} />
    ) : (
      <div className="bg-background border border-general-border flex flex-col gap-4 items-start overflow-hidden p-6 rounded-xl w-full">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPanelOpen(false)}
          className="h-9 px-4 rounded-xl gap-2 text-general-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <p className="text-sm text-general-muted-foreground">No content available.</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border p-4">
      <div className="flex flex-col gap-4">
        <Section
          label="problem"
          title={problemTitle}
          icon={MessageCircleWarning}
          chips={row.problem_keywords}
        />

        <Section
          label="solution"
          title={solutionTitle}
          icon={Puzzle}
          chips={row.solution_keywords}
        />

        {hasProof && (
          <Section
            label="proof"
            title={row.proof_head_term || ""}
            icon={FileCheck}
            chips={row.proof_keywords}
          />
        )}

        {hasAction && (
          <Section
            label="action"
            title={row.action_head_term || ""}
            icon={Lightbulb}
            chips={row.action_keywords}
          />
        )}

        <div className="flex gap-3">
          <MetricTile label="total volume">
            <span className="text-[12px] font-medium leading-normal tracking-[0.18px] text-general-foreground">
              {Number(row.totals.total_search_volume || 0).toLocaleString()}
            </span>
          </MetricTile>

          <MetricTile label="avg business relevance">
            <div className="flex items-center  min-h-6 py-[3px] px-0 rounded-md gap-1.5">
              <MiniBarsIcon />
              <span className="text-[12px] font-medium leading-normal tracking-[0.18px] text-general-foreground">
                {Math.round((row.totals.avg_business_relevance || 0) * 100)}
              </span>
            </div>
          </MetricTile>

          <MetricTile label="avg competition">
            <span className="text-[12px] font-medium leading-normal tracking-[0.18px] text-general-foreground">
              {(() => {
                const ratio = Number(row.totals.avg_competition || 0);
                const safe = Number.isFinite(ratio) ? ratio : 0;
                const pct = safe * 100;
                return `${pct.toFixed(2)}%`;
              })()}
            </span>
          </MetricTile>
        </div>

        <div className="flex justify-center">
          {showViewButton ? (
            <Button className="gap-2" type="button" onClick={handleOpenPanel}>
              <Eye className="h-4 w-4" />
              View
            </Button>
          ) : showGeneratingView ? (
            <Button className="gap-2" type="button" disabled>
              <Sparkles className="h-4 w-4" />
              Generating...
            </Button>
          ) : (
            <Button className="gap-2" type="button" onClick={handleGenerate} disabled={starting || initialStatusLoading}>
              <Sparkles className="h-4 w-4" />
              {initialStatusLoading ? "Loading..." : "Generate Ad"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
