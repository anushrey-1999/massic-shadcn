"use client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useAgentChat } from "./use-agent-chat";

type FeedbackState = Pick<
  ReturnType<typeof useAgentChat>,
  | "error"
  | "setError"
  | "recovery"
  | "reconciling"
  | "reconcile"
  | "creditWarning"
  | "history"
>;
export function AgentChatFeedback({ chat }: { chat: FeedbackState }) {
  return (
    <div className="space-y-2">
      {chat.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md bg-destructive/5 p-3 text-sm text-destructive"
        >
          <p className="min-w-0 flex-1 break-words">{chat.error}</p>
          <button
            type="button"
            className="cursor-pointer"
            aria-label="Dismiss error"
            onClick={() => chat.setError(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      {chat.recovery && (
        <div role="status" className="space-y-2 text-xs text-muted-foreground">
          <p>
            The connection was interrupted. Check the saved response before
            sending again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={chat.reconciling}
            onClick={() => void chat.reconcile()}
          >
            {chat.reconciling ? "Checking…" : "Check saved response"}
          </Button>
        </div>
      )}
      {chat.creditWarning && (
        <p className="text-xs text-muted-foreground">
          Agent credits are running low.
        </p>
      )}
      {chat.history.citations.isError && (
        <p className="text-xs text-muted-foreground">
          Sources could not be loaded.{" "}
          <button
            type="button"
            className="cursor-pointer underline"
            onClick={() => void chat.history.citations.refetch()}
          >
            Retry sources
          </button>
        </p>
      )}
    </div>
  );
}
