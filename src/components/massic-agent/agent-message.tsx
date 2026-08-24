"use client";

import * as React from "react";
import {
  Archive,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Database,
  Globe2,
  Link2,
  RefreshCw,
  Table2,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MassicLoader } from "@/components/ui/massic-loader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { renderLightMarkdown } from "@/components/chatbot/markdown";
import { cn } from "@/lib/utils";
import { AgentThinking } from "./agent-thinking";
import type {
  AgentMessage,
  CitationReference,
  CitationSegment,
  CitationSource,
  StreamPhase,
  WidgetPart,
} from "./types";

const TOOL_LABELS: Record<string, string> = {
  search_knowledge: "Searching knowledge base…",
  get_business_profile: "Loading business profile…",
  get_strategy_statuses: "Checking strategy status…",
  get_pages_details: "Fetching page details…",
  get_webpage_plan: "Reading content plan…",
  recall_memory: "Retrieving memories…",
  write_memory: "Saving memory…",
  forget_memory: "Removing memory…",
  save_plan: "Saving plan…",
  activate_plan: "Activating plan…",
};

const TOOL_DISPLAY_LABELS: Record<string, string> = {
  search_knowledge: "Knowledge search",
  get_business_profile: "Business profile",
  get_strategy_statuses: "Strategy status",
  get_pages_details: "Page details",
  get_webpage_plan: "Webpage plan",
  recall_memory: "Memory recall",
  write_memory: "Memory saved",
  forget_memory: "Memory removed",
  save_plan: "Plan saved",
  activate_plan: "Plan activated",
};

function toolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? `Running ${toolName.replace(/_/g, " ")}…`;
}

function toolDisplayLabel(toolName: string): string {
  return TOOL_DISPLAY_LABELS[toolName] ?? toolName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function ToolIndicatorRow({ toolName }: { toolName: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="h-2 w-2 rounded-full bg-general-primary/60 animate-pulse" />
      <span className="italic font-medium bg-linear-to-r from-muted-foreground via-foreground to-muted-foreground bg-size-[200%_100%] bg-clip-text text-transparent animate-[shimmer_2s_linear_infinite]">
        {toolLabel(toolName)}
      </span>
    </div>
  );
}

function ToolUsageSummary({ tools }: { tools: string[] }) {
  if (tools.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="font-medium text-muted-foreground/70">Tools used</span>
      {tools.map((tool) => (
        <span
          key={tool}
          className="rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-foreground/80"
        >
          {toolDisplayLabel(tool)}
        </span>
      ))}
    </div>
  );
}

const proseClasses = cn(
  "text-[15px] leading-6 text-foreground",
  "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold",
  "[&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-lg [&_h2]:font-semibold",
  "[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold",
  "[&_h4]:mt-2.5 [&_h4]:mb-1 [&_h4]:text-sm [&_h4]:font-semibold",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1",
  "[&_li]:leading-6 [&_li_p]:my-0",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_em]:italic",
  "[&_a]:text-general-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:font-mono",
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:text-[13px] [&_pre]:leading-6",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_hr]:my-6 [&_hr]:border-border"
);

function extractToolUsage(content: string): { body: string; tools: string[] } {
  const tools: string[] = [];
  const bodyLines = content.split("\n").filter((line) => {
    const normalized = line.trim().replace(/^_+|_+$/g, "");
    const match = /^Tools used:\s*(.+)$/i.exec(normalized);
    if (!match) return true;

    tools.push(
      ...match[1]
        .split(",")
        .map((tool) => tool.trim().replace(/^`+|`+$/g, ""))
        .filter(Boolean)
    );
    return false;
  });

  return {
    body: bodyLines.join("\n").trim(),
    tools: Array.from(new Set(tools)),
  };
}

function formatAgentContent(content: string): string {
  const match = content.match(/(^|\n)(Plan highlights):\s*/i);
  if (!match || match.index === undefined) return content;

  const prefix = match[1] ?? "";
  const markerStart = match.index + prefix.length;
  const markerEnd = match.index + match[0].length;
  const before = content.slice(0, markerStart);
  const afterMarker = content.slice(markerEnd);
  const sectionBreak = afterMarker.search(/\n{2,}/);
  const bulletSection = sectionBreak === -1 ? afterMarker : afterMarker.slice(0, sectionBreak);
  const rest = sectionBreak === -1 ? "" : afterMarker.slice(sectionBreak);
  const trimmedSection = bulletSection.trim();

  if (!trimmedSection.startsWith("-")) return content;

  const bullets = trimmedSection
    .replace(/^-\s*/, "")
    .split(/\s+-\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (bullets.length === 0) return content;

  return [
    before.trimEnd(),
    "### Plan highlights",
    bullets.map((item) => `- ${item}`).join("\n"),
    rest.trimStart(),
  ].filter(Boolean).join("\n\n");
}

function getReferenceNumber(reference: CitationReference): number | null {
  const value = reference.ref ?? reference.ref_id ?? reference.index ?? reference.id;
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function getSourceId(source: CitationSource): string | null {
  const id = source.source_id ?? source.id;
  return id === undefined ? null : String(id);
}

function getSourceTitle(source: CitationSource, index: number): string {
  return source.title ?? source.label ?? source.source_type ?? `Source ${index + 1}`;
}

function getSourceDetail(source: CitationSource): string {
  const detail = source.detail ?? source.content ?? source.url;
  if (detail) return String(detail);

  const skipped = new Set([
    "id",
    "source_id",
    "source_type",
    "title",
    "label",
    "detail",
    "content",
    "url",
    "tool_name",
    "call_id",
    "plan_id",
    "status",
  ]);
  const pairs = Object.entries(source)
    .filter(([key, value]) => !skipped.has(key) && value !== null && value !== undefined)
    .slice(0, 4)
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`);
  return pairs.join(" · ");
}

function getSourceMetaEntries(source: CitationSource): Array<{ label: string; value: string; tone?: "primary" | "success" | "muted" }> {
  const entries: Array<{ label: string; value: string; tone?: "primary" | "success" | "muted" }> = [];
  const raw = source as Record<string, unknown>;

  if (raw.tool_name) {
    entries.push({ label: "Tool", value: toolDisplayLabel(String(raw.tool_name)), tone: "primary" });
  }
  if (raw.call_id) {
    entries.push({ label: "Call ID", value: String(raw.call_id), tone: "muted" });
  }
  if (raw.plan_id) {
    entries.push({ label: "Plan", value: `#${String(raw.plan_id)}`, tone: "muted" });
  }
  if (raw.status) {
    entries.push({ label: "Status", value: String(raw.status), tone: String(raw.status).toLowerCase() === "active" ? "success" : "muted" });
  }

  return entries;
}

function SourceMetadata({ source }: { source: CitationSource }) {
  const entries = getSourceMetaEntries(source);
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {entries.map((entry) => (
        <span
          key={`${entry.label}-${entry.value}`}
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-[11px] leading-none",
            entry.tone === "primary" && "border-general-primary/25 bg-general-primary/10 text-general-primary",
            entry.tone === "success" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
            (!entry.tone || entry.tone === "muted") && "border-border bg-muted/50 text-muted-foreground"
          )}
        >
          <span className="font-medium">{entry.label}</span>
          <span className={cn("truncate", entry.label === "Call ID" && "font-mono")}>
            {entry.value}
          </span>
        </span>
      ))}
    </div>
  );
}

function agentLabel(segment: CitationSegment, index: number): string {
  if (segment.label) return segment.label;
  if (segment.agent === "webpages") return "Webpages planner";
  if (segment.agent === "main") return "Main agent";
  return `Segment ${index + 1}`;
}

function sourceTypeLabel(sourceType?: string | null): string {
  if (!sourceType) return "Source";
  return sourceType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function referenceIcon(refType?: string | null) {
  switch (refType) {
    case "tool_result":
      return Database;
    case "learning":
      return Brain;
    case "history":
      return Clock;
    case "context":
      return UserRound;
    case "summary":
      return Archive;
    case "general_knowledge":
      return Globe2;
    case "assumption":
      return TriangleAlert;
    case "reasoning":
      return Link2;
    default:
      return Link2;
  }
}

function buildReferenceMap(segments?: CitationSegment[]): Map<number, CitationReference> {
  const refs = new Map<number, CitationReference>();
  segments?.forEach((segment) => {
    segment.references?.forEach((reference) => {
      const number = getReferenceNumber(reference);
      if (number !== null && !refs.has(number)) refs.set(number, reference);
    });
  });
  return refs;
}

function scrollToCitationSource(scopeId: string, sourceId: string | number) {
  const el = document.getElementById(`agent-citation-source-${scopeId}-${String(sourceId)}`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function CitationChip({
  number,
  reference,
  scopeId,
}: {
  number: number;
  reference: CitationReference;
  scopeId: string;
}) {
  const Icon = referenceIcon(reference.ref_type);
  const label = reference.label ?? `Reference ${number}`;
  const detail = reference.detail ?? "";
  const sourceIds = reference.source_ids ?? [];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => {
              if (sourceIds.length > 0) scrollToCitationSource(scopeId, sourceIds[0]);
            }}
            className="mx-0.5 inline-flex h-5 -translate-y-px items-center gap-1 rounded-full border border-general-primary/25 bg-general-primary/10 px-1.5 text-[11px] font-medium leading-none text-general-primary hover:bg-general-primary/15"
          >
            <Icon className="h-3 w-3" />
            {number}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{label}</p>
            {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PlainReference({ number }: { number: number }) {
  return (
    <sup className="mx-0.5 text-[11px] font-medium text-muted-foreground">
      [{number}]
    </sup>
  );
}

function AgentCitationPanels({
  segments,
  scopeId,
}: {
  segments?: CitationSegment[];
  scopeId: string;
}) {
  const [open, setOpen] = React.useState(false);
  if (!segments?.length) return null;

  const reasoningCount = segments.reduce((count, segment) => count + (segment.reasoning?.length ?? 0), 0);
  const sourceCount = segments.reduce((count, segment) => count + (segment.sources?.length ?? 0), 0);
  if (reasoningCount === 0 && sourceCount === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="max-w-3xl">
      <CollapsibleTrigger className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground">
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <span>{sourceCount > 0 ? `${sourceCount} source${sourceCount === 1 ? "" : "s"}` : "Reasoning"}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-3">
        {segments.map((segment, segmentIndex) => (
          <div key={segmentIndex} className="rounded-xl border border-border bg-muted/20 p-3">
            {segments.length > 1 ? (
              <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {agentLabel(segment, segmentIndex)}
              </div>
            ) : null}

            {segment.reasoning?.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Reasoning</p>
                {segment.reasoning.map((item, idx) => (
                  <div key={idx} className="rounded-lg bg-background/70 px-3 py-2 text-xs leading-relaxed text-foreground/80">
                    {item.tool_name ? (
                      <span className="mb-1 inline-flex rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {toolDisplayLabel(item.tool_name)}
                      </span>
                    ) : null}
                    <p className="whitespace-pre-wrap">{item.text ?? getSourceDetail(item as CitationSource)}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {segment.sources?.length ? (
              <div className={cn("space-y-2", segment.reasoning?.length ? "mt-4" : "")}>
                <p className="text-xs font-medium text-muted-foreground/70">Sources</p>
                {segment.sources.map((source, idx) => {
                  const sourceId = getSourceId(source) ?? `${segmentIndex}-${idx}`;
                  const detail = getSourceDetail(source);
                  return (
                    <div
                      key={sourceId}
                      id={`agent-citation-source-${scopeId}-${sourceId}`}
                      className="rounded-lg border border-border bg-background px-3 py-2 transition-colors target:bg-general-primary/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {getSourceTitle(source, idx)}
                          </p>
                          <SourceMetadata source={source} />
                          {detail ? (
                            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                              {detail}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {sourceTypeLabel(source.source_type)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

type Props = {
  message: AgentMessage;
  isLast: boolean;
  streamPhase: StreamPhase;
  activeToolName?: string | null;
  onOpenWidget?: (part: WidgetPart) => void;
  onRegenerate?: () => void;
};

function AgentWidgetPartView({
  part,
  onOpenWidget,
}: {
  part: WidgetPart;
  onOpenWidget?: (part: WidgetPart) => void;
}) {
  const isPlan = part.resource.type === "webpage_plan";
  return (
    <button
      type="button"
      onClick={() => onOpenWidget?.(part)}
      className="mt-1 flex w-full max-w-md items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left shadow-xs transition-colors hover:border-general-primary/30 hover:bg-general-primary/5"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-general-primary/10 text-general-primary">
        <Table2 className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          {isPlan ? `Plan #${String(part.resource.id)}` : `${part.widget || "Artifact"} #${String(part.resource.id)}`}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Click to open {isPlan ? "the detailed plan table" : "artifact"} in split view
        </span>
      </span>
      <span className="shrink-0 text-xs font-medium text-general-primary">
        Open
      </span>
    </button>
  );
}

export function AgentMessageView({
  message,
  isLast,
  streamPhase,
  activeToolName,
  onOpenWidget,
  onRegenerate,
}: Props) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  if (message.role === "user") {
    return (
      <div className="group flex justify-end">
        <div className="flex max-w-[85%] items-start gap-1.5">
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopy}
                  aria-label="Copy message"
                  className="mt-1 h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied!" : "Copy"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  const thinkingActive = isLast && streamPhase === "thinking";
  const respondingActive = isLast && streamPhase === "responding";
  const showToolIndicator = isLast && streamPhase === "tool" && !!activeToolName;
  const isStreaming = isLast && streamPhase !== null;
  // Show thinking block whenever:
  // - the thinking phase is actively running (even before text accumulates), OR
  // - there's committed thinking text to display
  const showThinkingBlock = thinkingActive || Boolean(message.thinking);
  const isInterrupted = message.partial === true;
  const formattedContent = extractToolUsage(formatAgentContent(message.content));
  const citationReferences = buildReferenceMap(message.citations);

  return (
    <div className="group flex flex-col gap-3">
      {showThinkingBlock ? (
        <AgentThinking
          text={message.thinking || ""}
          isActive={thinkingActive}
        />
      ) : null}

      {showToolIndicator ? (
        <ToolIndicatorRow toolName={activeToolName!} />
      ) : null}

      {message.content || respondingActive ? (
        <>
          {formattedContent.body ? (
            <div className={proseClasses}>
              {renderLightMarkdown(formattedContent.body, [
                {
                  re: /\[ref:(\d+)\]/,
                  wrap: (match) => {
                    const number = Number(match[1]);
                    const reference = citationReferences.get(number);
                    return reference ? (
                      <CitationChip
                        number={number}
                        reference={reference}
                        scopeId={message.id}
                      />
                    ) : (
                      <PlainReference number={number} />
                    );
                  },
                },
              ])}
            </div>
          ) : null}
          <ToolUsageSummary tools={formattedContent.tools} />
        </>
      ) : thinkingActive && !message.thinking ? (
        // Agent has started but no tokens yet — show a pulsing placeholder
        <div className="flex items-center gap-1.5 py-1">
          <span className="h-2 w-2 rounded-full bg-general-primary/60 animate-bounce [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-general-primary/60 animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-general-primary/60 animate-bounce [animation-delay:300ms]" />
        </div>
      ) : null}

      {isInterrupted ? (
        <p className="text-xs text-muted-foreground italic">Response interrupted</p>
      ) : null}

      <AgentCitationPanels segments={message.citations} scopeId={message.id} />

      {message.widgetParts?.length ? (
        <div className="space-y-3">
          {message.widgetParts.map((part) => (
            <AgentWidgetPartView
              key={`${part.source.tool_call_id}-${part.resource.type}-${String(part.resource.id)}`}
              part={part}
              onOpenWidget={onOpenWidget}
            />
          ))}
        </div>
      ) : null}

      {!isStreaming && message.content ? (
        <TooltipProvider delayDuration={400}>
          <div
            className={cn(
              "flex items-center gap-0.5 transition-opacity",
              isLast ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopy}
                  aria-label="Copy"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied!" : "Copy"}</TooltipContent>
            </Tooltip>

            {/*
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setFeedback(feedback === "up" ? null : "up")}
                  aria-label="Good response"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground data-[active=true]:text-foreground"
                  data-active={feedback === "up"}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Good response</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setFeedback(feedback === "down" ? null : "down")}
                  aria-label="Bad response"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground data-[active=true]:text-foreground"
                  data-active={feedback === "down"}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bad response</TooltipContent>
            </Tooltip>
            */}

            {onRegenerate ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onRegenerate}
                    aria-label="Regenerate"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Regenerate</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </TooltipProvider>
      ) : null}
    </div>
  );
}
