"use client";

import * as React from "react";
import { Check, Copy, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MassicLoader } from "@/components/ui/massic-loader";
import { renderLightMarkdown } from "@/components/chatbot/markdown";
import { cn } from "@/lib/utils";
import { AgentThinking } from "./agent-thinking";
import type { AgentAction, AgentMessage, StreamPhase } from "./types";

function AgentActionRow({ action }: { action: AgentAction }) {
  if (action.status !== "running") return null;
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <MassicLoader size={18} animate />
      <span className="italic font-medium bg-linear-to-r from-muted-foreground via-foreground to-muted-foreground bg-size-[200%_100%] bg-clip-text text-transparent animate-[shimmer_2s_linear_infinite]">
        {action.label}
      </span>
    </div>
  );
}

const proseClasses = cn(
  "text-[15px] leading-7 text-foreground",
  "[&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-semibold",
  "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold",
  "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold",
  "[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-sm [&_h4]:font-semibold",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5",
  "[&_li]:leading-7 [&_li_p]:my-0",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_em]:italic",
  "[&_a]:text-general-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:font-mono",
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:text-[13px] [&_pre]:leading-6",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_hr]:my-6 [&_hr]:border-border"
);

type Props = {
  message: AgentMessage;
  isLast: boolean;
  streamPhase: StreamPhase;
  onRegenerate?: () => void;
};

export function AgentMessageView({ message, isLast, streamPhase, onRegenerate }: Props) {
  const [copied, setCopied] = React.useState(false);
  const [feedback, setFeedback] = React.useState<"up" | "down" | null>(null);

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
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  const thinkingActive = isLast && streamPhase === "thinking";
  const respondingActive = isLast && streamPhase === "responding";
  const isStreaming =
    isLast && (streamPhase === "thinking" || streamPhase === "searching" || streamPhase === "responding");
  const showThinkingBlock = thinkingActive || Boolean(message.thinking);

  const actions = message.actions || [];

  return (
    <div className="group flex flex-col gap-3">
      {showThinkingBlock ? (
        <AgentThinking text={message.thinking || ""} isActive={thinkingActive} />
      ) : null}

      {actions.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {actions.map((a) => (
            <AgentActionRow key={a.id} action={a} />
          ))}
        </div>
      ) : null}

      {message.content || respondingActive ? (
        <div className={proseClasses}>
          {renderLightMarkdown(message.content)}
        </div>
      ) : null}

      {!isStreaming && message.content ? (
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isLast ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            aria-label="Copy"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
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
          {onRegenerate ? (
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
