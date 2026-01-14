"use client";

import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationPreview } from "./types";

type Props = {
  conversations: ConversationPreview[];
  isLoading: boolean;
  onSelectConversation: (convId: string) => void;
};

function formatConversationDate(title: string): string {
  // Extract date from title if it contains one, otherwise return empty
  // Expected format in title might include date info
  // For now, return empty as API provides title directly
  return "";
}

function truncateTitle(title: string, maxLength: number = 60): string {
  if (title.length > maxLength) {
    return title.slice(0, maxLength) + "...";
  }
  return title;
}

export function ChatHistoryList({ conversations, isLoading, onSelectConversation }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mb-2" />
        <span className="text-sm">Loading conversations...</span>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <span className="text-sm">No conversations yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conv) => (
        <button
          key={conv.conv_id}
          onClick={() => onSelectConversation(conv.conv_id)}
          className={cn(
            "w-full text-left p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors group",
            "flex items-center justify-between gap-3"
          )}
        >
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base text-general-foreground group-hover:text-primary transition-colors truncate leading-[150%]">
              {truncateTitle(conv.title)}
            </h3>
            {/* <p className="text-xs text-muted-foreground mt-1">
              {formatConversationDate(conv.title)}
            </p> */}
          </div>
          <ArrowRight className="h-5 w-5 text-general-border-four shrink-0 group-hover:text-primary transition-colors" />
        </button>
      ))}
    </div>
  );
}
