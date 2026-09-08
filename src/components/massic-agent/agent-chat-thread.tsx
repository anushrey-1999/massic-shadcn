"use client";

import * as React from "react";
import { ArrowDown } from "lucide-react";
import { MassicLoader } from "@/components/ui/massic-loader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AgentMessageView } from "./agent-message";
import type { AgentMessage, StreamPhase, WidgetPart } from "./types";

type Props = {
  messages: AgentMessage[];
  streamPhase: StreamPhase;
  activeToolName?: string | null;
  align?: "center" | "left";
  messagesLoading?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onOpenWidget?: (part: WidgetPart) => void;
  onRegenerate?: () => void;
};

export function AgentChatThread({
  messages,
  streamPhase,
  activeToolName,
  align = "center",
  messagesLoading,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpenWidget,
  onRegenerate,
}: Props) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const [showScrollBtn, setShowScrollBtn] = React.useState(false);

  const scrollToBottom = React.useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, streamPhase, scrollToBottom]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distanceFromBottom > 120);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const lastMessage = messages[messages.length - 1];
  const isStreaming = streamPhase !== null;
  const showBottomLoader =
    lastMessage?.role === "assistant" && streamPhase !== "thinking";
  const animateBottomLoader = isStreaming;

  return (
    <div className="relative flex-1 min-h-0">
      <div ref={scrollRef} className="h-full overflow-y-auto">
        <div
          className={cn(
            "w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6",
            align === "center" && "mx-auto"
          )}
        >
          {hasMore ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="text-xs text-muted-foreground"
              >
                {loadingMore ? "Loading…" : "Load older messages"}
              </Button>
            </div>
          ) : null}

          {messagesLoading ? (
            <div className="flex justify-center py-8">
              <MassicLoader size={28} animate />
            </div>
          ) : null}

          {messages.map((m, i) => (
            <AgentMessageView
              key={m.id}
              message={m}
              isLast={i === messages.length - 1}
              streamPhase={streamPhase}
              activeToolName={i === messages.length - 1 ? activeToolName : null}
              onOpenWidget={onOpenWidget}
              onRegenerate={
                m.role === "assistant" && i === messages.length - 1 && streamPhase === null
                  ? onRegenerate
                  : undefined
              }
            />
          ))}

          {showBottomLoader ? (
            <div className="flex items-center pt-1">
              <MassicLoader size={28} animate={animateBottomLoader} />
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      {showScrollBtn ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={scrollToBottom}
            className="h-8 w-8 rounded-full shadow-md bg-background text-muted-foreground hover:bg-background hover:border-general-primary/40 hover:text-foreground"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
