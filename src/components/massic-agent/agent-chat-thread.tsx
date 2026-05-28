"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MassicLoader } from "@/components/ui/massic-loader";
import { AgentMessageView } from "./agent-message";
import { AgentEmptyState } from "./agent-empty-state";
import type { AgentMessage, StreamPhase } from "./types";

type Props = {
  messages: AgentMessage[];
  streamPhase: StreamPhase;
  onPickSuggestion: (text: string) => void;
  onRegenerate?: () => void;
};

export function AgentChatThread({
  messages,
  streamPhase,
  onPickSuggestion,
  onRegenerate,
}: Props) {
  const bottomRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamPhase]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 min-h-0">
        <AgentEmptyState onPick={onPickSuggestion} />
      </div>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const isStreaming = streamPhase !== null;
  const showBottomLoader =
    lastMessage.role === "assistant" &&
    streamPhase !== "thinking" &&
    streamPhase !== "searching";

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        {messages.map((m, i) => (
          <AgentMessageView
            key={m.id}
            message={m}
            isLast={i === messages.length - 1}
            streamPhase={streamPhase}
            onRegenerate={
              m.role === "assistant" && i === messages.length - 1 && streamPhase === null
                ? onRegenerate
                : undefined
            }
          />
        ))}

        {showBottomLoader ? (
          <div className="flex items-center pt-1">
            <MassicLoader size={28} animate={isStreaming} />
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
