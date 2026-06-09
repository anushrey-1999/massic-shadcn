"use client";

import * as React from "react";
import { Check, Copy, RefreshCw, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MassicLoader } from "@/components/ui/massic-loader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { renderLightMarkdown } from "@/components/chatbot/markdown";
import { cn } from "@/lib/utils";
import { AgentThinking } from "./agent-thinking";
import type { AgentMessage, StreamPhase, WidgetPart } from "./types";

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
      <MassicLoader size={18} animate />
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
      <span className="font-medium">Tools used</span>
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
              {renderLightMarkdown(formattedContent.body)}
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
