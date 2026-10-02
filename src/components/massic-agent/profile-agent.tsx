"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { JobResponse } from "@/types/profile-v2";
import { agentKeys, errorMessage, getLatestThread } from "./agent-api";
import {
  AgentAttachmentControls,
  AgentAttachmentsProvider,
} from "./agent-attachments";
import { AgentChatFeedback } from "./agent-chat-feedback";
import { AgentChatThread } from "./agent-chat-thread";
import { AgentCitationsDrawer } from "./agent-citations-drawer";
import { AgentComposer } from "./agent-composer";
import { attachmentsReady } from "./agent-uploads";
import { profileAgentDisabledReason } from "./profile-agent-model";
import { useAgentChat } from "./use-agent-chat";

export function useProfileAgent({
  businessId,
  job,
  dirty,
  saving,
  onRefresh,
}: {
  businessId: string;
  job?: JobResponse | null;
  dirty: boolean;
  saving: boolean;
  onRefresh?: (signal: AbortSignal) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [confirmedThread, setConfirmedThread] = useState<string>();
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const lookup = useRef<AbortController | null>(null);
  const refreshController = useRef<AbortController | null>(null);
  const disabledReason = profileAgentDisabledReason(job, dirty, saving);

  const refresh = async () => {
    if (!onRefresh) return;
    refreshController.current?.abort();
    const controller = new AbortController();
    refreshController.current = controller;
    setRefreshing(true);
    setRefreshError(null);
    try {
      await onRefresh(controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) {
        setRefreshError(errorMessage(error));
        throw error;
      }
    } finally {
      if (!controller.signal.aborted) setRefreshing(false);
    }
  };
  const chat = useAgentChat(businessId, {
    agentId: "profile",
    tag: "profile.update",
    threadId,
    confirmedThread,
    enabled:
      opened && !lookingUp && !lookupError && !refreshError && !disabledReason,
    onThreadChange: (thread) => {
      setThreadId(thread);
      setConfirmedThread(thread ?? undefined);
    },
    onSettled: refresh,
  });
  const busy =
    !!chat.runningKey || refreshing || !!chat.recovery || !!refreshError;
  const closeAgent = () => {
    setOpen(false);
    // Active responses refresh on settlement, even while the dialog is closed.
    if (open && !busy) void refresh().catch(() => {});
  };
  const openAgent = async () => {
    if (disabledReason && !busy) return;
    setOpen(true);
    if (busy || lookingUp) return;
    lookup.current?.abort();
    const controller = new AbortController();
    lookup.current = controller;
    setLookingUp(true);
    setLookupError(null);
    setOpened(true);
    try {
      const thread = await getLatestThread(
        businessId,
        "profile.update",
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setThreadId(thread?.thread_id ?? null);
      setConfirmedThread(thread?.thread_id);
      if (thread)
        await queryClient.invalidateQueries({
          queryKey: agentKeys.messages(businessId, thread.thread_id),
        });
    } catch (error) {
      if (!controller.signal.aborted) setLookupError(errorMessage(error));
    } finally {
      if (!controller.signal.aborted) setLookingUp(false);
    }
  };
  useEffect(
    () => () => {
      lookup.current?.abort();
      refreshController.current?.abort();
    },
    [],
  );
  return {
    chat,
    open,
    closeAgent,
    openAgent,
    busy,
    disabledReason,
    lookingUp,
    lookupError,
    refreshing,
    refreshError,
    refresh,
  };
}

type ProfileAgentController = ReturnType<typeof useProfileAgent>;

export function ProfileAgentButton({
  agent,
}: {
  agent: ProfileAgentController;
}) {
  const disabled = !!agent.disabledReason && !agent.busy;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => void agent.openAgent()}
            className="gap-2"
          >
            {agent.busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageSquare className="size-4" />
            )}
            {agent.busy ? "Profile agent working…" : "Profile agent"}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {disabled
          ? agent.disabledReason
          : agent.busy
            ? "Open the profile agent to view progress."
            : "Update your profile by chatting with Massic."}
      </TooltipContent>
    </Tooltip>
  );
}

export function ProfileAgentDialog({
  businessId,
  agent,
}: {
  businessId: string;
  agent: ProfileAgentController;
}) {
  const { chat } = agent;
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const sourcesFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!agent.open) setSourcesOpen(false);
  }, [agent.open]);
  const loading =
    agent.lookingUp ||
    (!!chat.activeKey &&
      !chat.activeKey.startsWith("draft:") &&
      chat.history.messages.isPending &&
      !chat.messages.length);
  const blocked =
    !!agent.disabledReason ||
    !!agent.lookupError ||
    !!agent.refreshError ||
    !!chat.recovery ||
    !chat.knownThread ||
    chat.history.messages.isError;
  return (
    <AgentAttachmentsProvider business={businessId}>
      <Dialog
        open={agent.open}
        onOpenChange={(open) => {
          if (open) void agent.openAgent();
          else agent.closeAgent();
        }}
      >
        <DialogContent className="flex h-[85dvh] min-h-0 max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 border-b px-4 py-4 pr-12 text-left sm:px-6">
            <DialogTitle className="font-medium">Profile agent</DialogTitle>
            <DialogDescription>
              Tell Massic what to update in your business profile. Changes are
              saved by the agent.
            </DialogDescription>
          </DialogHeader>
          <div className="relative flex min-h-0 flex-1 flex-col">
            {loading ? (
              <div
                role="status"
                className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                <Loader2 className="size-4 animate-spin" />
                Loading conversation…
              </div>
            ) : agent.lookupError ? (
              <div role="alert" className="flex-1 space-y-3 p-6 text-sm">
                <p>{agent.lookupError}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void agent.openAgent()}
                >
                  Retry
                </Button>
              </div>
            ) : chat.history.messages.isError ? (
              <div role="alert" className="flex-1 space-y-3 p-6 text-sm">
                <p>{errorMessage(chat.history.messages.error)}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void chat.history.messages.refetch()}
                >
                  Reload conversation
                </Button>
              </div>
            ) : chat.messages.length ? (
              <AgentChatThread
                key={chat.presentationKey}
                messages={chat.messages}
                streaming={!!chat.runningKey}
                activeResource={null}
                onOpenPlan={() => {}}
                onOpenCitations={(trigger) => {
                  sourcesFocus.current = trigger;
                  setSourcesOpen(true);
                }}
                hasMore={chat.history.messages.hasNextPage}
                loadingMore={chat.history.messages.isFetchingNextPage}
                onLoadMore={() => void chat.history.messages.fetchNextPage()}
              />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                <MessageSquare className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium">
                  What would you like to update?
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Describe a change to your offerings, business details, or
                  brand voice. You can attach supporting files.
                </p>
              </div>
            )}
            <AgentCitationsDrawer
              business={businessId}
              thread={chat.activeKey}
              title="Profile updates"
              messages={chat.messages}
              streaming={!!chat.runningKey}
              open={sourcesOpen}
              onOpenChange={setSourcesOpen}
              returnFocus={sourcesFocus.current}
            />
          </div>
          <div className="max-h-[45%] shrink-0 space-y-2 overflow-y-auto border-t px-4 py-3 sm:px-6">
            <AgentChatFeedback chat={chat} />
            {agent.refreshError && (
              <div role="alert" className="space-y-2 text-sm">
                <p>Profile refresh failed: {agent.refreshError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={agent.refreshing}
                  onClick={() => void agent.refresh().catch(() => {})}
                >
                  Retry profile refresh
                </Button>
              </div>
            )}
            {agent.refreshing && (
              <p role="status" className="text-xs text-muted-foreground">
                Refreshing your profile…
              </p>
            )}
            {agent.disabledReason && !chat.runningKey && (
              <p className="text-xs text-muted-foreground">
                {agent.disabledReason}
              </p>
            )}
            <AgentComposer
              value={chat.draft.input}
              onChange={(input) => chat.updateDraft({ input })}
              onSend={() => void chat.send()}
              onStop={() => void chat.stop()}
              streaming={!!chat.runningKey}
              stopping={chat.stopping}
              disabled={blocked || loading || agent.refreshing}
              sendDisabled={!attachmentsReady(chat.draft.attachments)}
              focusKey={`${agent.open}:${chat.presentationKey}:${loading}`}
              label="Message profile agent"
              placeholder="Describe a profile change…"
              attachments={
                <AgentAttachmentControls
                  files={chat.draft.attachments}
                  disabled={!!chat.runningKey || blocked || loading}
                  onAdd={chat.addFiles}
                  onRemove={chat.removeFile}
                  onRetry={chat.retryFile}
                />
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </AgentAttachmentsProvider>
  );
}
