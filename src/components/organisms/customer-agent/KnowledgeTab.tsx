"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, Loader2, MessageSquareText } from "lucide-react";
import { AgentMarkdown } from "@/components/massic-agent/agent-markdown";
import markdownStyles from "@/components/massic-agent/agent.module.css";
import { Button } from "@/components/ui/button";
import { api } from "@/hooks/use-api";
import {
  AgentAttachmentControls,
  AgentAttachmentsProvider,
} from "@/components/massic-agent/agent-attachments";
import { AgentChatFeedback } from "@/components/massic-agent/agent-chat-feedback";
import { AgentChatThread } from "@/components/massic-agent/agent-chat-thread";
import { AgentComposer } from "@/components/massic-agent/agent-composer";
import { errorMessage, getLatestThread } from "@/components/massic-agent/agent-api";
import { attachmentsReady } from "@/components/massic-agent/agent-uploads";
import { useAgentChat } from "@/components/massic-agent/use-agent-chat";

type Playbook = {
  business_id?: string;
  doc_type?: string;
  content: string;
  version: number;
  updated_at?: string | null;
};

const playbookKey = (businessId: string) =>
  ["massic-agent", businessId, "document", "receptionist_playbook"] as const;

async function getPlaybook(businessId: string): Promise<Playbook> {
  try {
    return await api.get<Playbook>("/agent/docs/receptionist_playbook", "python", {
      params: { business_id: businessId },
    });
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status === 404)
      return { content: "", version: 0 };
    throw error;
  }
}

export function KnowledgeTab({ businessId }: { businessId: string }) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [confirmedThread, setConfirmedThread] = useState<string>();
  const [lookupPending, setLookupPending] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const mounted = useRef(true);
  const playbook = useQuery({
    queryKey: playbookKey(businessId),
    queryFn: () => getPlaybook(businessId),
    retry: false,
  });
  const loadLatestThread = async (signal?: AbortSignal) => {
    setLookupPending(true);
    setLookupError(null);
    try {
      const thread = await getLatestThread(businessId, "trainer", signal);
      if (signal?.aborted || !mounted.current) return;
      setThreadId(thread?.thread_id ?? null);
      setConfirmedThread(thread?.thread_id);
    } catch (error) {
      if (!signal?.aborted && mounted.current) setLookupError(errorMessage(error));
    } finally {
      if (!signal?.aborted && mounted.current) setLookupPending(false);
    }
  };
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void loadLatestThread(controller.signal);
    return () => {
      mounted.current = false;
      controller.abort();
    };
    // The business-scoped tab remounts when businessId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const chat = useAgentChat(businessId, {
    agentId: "trainer",
    tag: "trainer",
    threadId,
    confirmedThread,
    enabled: !lookupPending && !lookupError,
    onThreadChange: (thread) => {
      setThreadId(thread);
      setConfirmedThread(thread ?? undefined);
    },
    onTurnEnd: (message) => {
      const playbookChanged = message.widgetParts?.some(
        (part) =>
          part.widget === "document" &&
          part.resource.type === "receptionist_playbook",
      );
      if (playbookChanged) void playbook.refetch();
    },
  });
  const loadingMessages =
    !!chat.conversation && chat.history.messages.isLoading && !chat.messages.length;
  const blocked =
    lookupPending ||
    !!lookupError ||
    loadingMessages ||
    chat.history.messages.isError ||
    !chat.knownThread ||
    !!chat.recovery;

  return (
    <AgentAttachmentsProvider business={businessId}>
      <div className="grid min-h-[620px] gap-4 pb-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <section className="flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-lg border border-general-border bg-background shadow-xs lg:min-h-0">
        <header className="shrink-0 border-b border-general-border px-4 py-3">
          <h2 className="text-sm font-medium text-general-foreground">Train your customer agent</h2>
        </header>
        <div className="relative flex min-h-0 flex-1 flex-col">
          {lookupPending || loadingMessages ? (
            <div role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-general-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading trainer…
            </div>
          ) : lookupError ? (
            <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-destructive">{lookupError}</p>
              <Button variant="outline" size="sm" onClick={() => void loadLatestThread()}>
                Try again
              </Button>
            </div>
          ) : chat.history.messages.isError ? (
            <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-destructive">{errorMessage(chat.history.messages.error)}</p>
              <Button variant="outline" size="sm" onClick={() => void chat.history.messages.refetch()}>
                Reload conversation
              </Button>
            </div>
          ) : chat.messages.length ? (
            <AgentChatThread
              key={chat.presentationKey}
              messages={chat.messages}
              streaming={Boolean(chat.runningKey)}
              activeResource={null}
              onOpenPlan={() => {}}
              onOpenCitations={() => {}}
              hasMore={chat.history.messages.hasNextPage}
              loadingMore={chat.history.messages.isFetchingNextPage}
              onLoadMore={() => void chat.history.messages.fetchNextPage()}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
              <MessageSquareText className="size-6 text-general-muted-foreground" />
              <p className="text-sm font-medium text-general-foreground">What should your customer agent know?</p>
              <p className="max-w-sm text-sm text-general-muted-foreground">
                Share services, policies, common questions, or how visitor requests should be handled.
              </p>
            </div>
          )}
        </div>
        <div className="shrink-0 space-y-2 border-t border-general-border px-4 py-3">
          <AgentChatFeedback chat={chat} />
          <AgentComposer
            value={chat.draft.input}
            onChange={(input) => chat.updateDraft({ input })}
            onSend={() => void chat.send()}
            onStop={() => void chat.stop()}
            streaming={Boolean(chat.runningKey)}
            stopping={chat.stopping}
            disabled={blocked}
            sendDisabled={!attachmentsReady(chat.draft.attachments)}
            focusKey={chat.presentationKey}
            placeholder="Teach the trainer about your business"
            label="Message trainer"
            attachments={
              <AgentAttachmentControls
                files={chat.draft.attachments}
                disabled={Boolean(chat.runningKey) || blocked}
                onAdd={chat.addFiles}
                onRemove={chat.removeFile}
                onRetry={chat.retryFile}
              />
            }
          />
        </div>
      </section>

      <section className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-lg border border-general-border bg-background shadow-xs lg:min-h-0">
        <header className="shrink-0 border-b border-general-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-general-foreground">
            <BookOpenText className="size-4" />
            Latest playbook
          </h2>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {playbook.isLoading ? (
            <div role="status" className="flex h-full items-center justify-center gap-2 text-sm text-general-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading playbook…
            </div>
          ) : playbook.isError ? (
            <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-destructive">{errorMessage(playbook.error)}</p>
              <Button variant="outline" size="sm" onClick={() => void playbook.refetch()}>Try again</Button>
            </div>
          ) : playbook.data?.content.trim() ? (
            <div className={`${markdownStyles.markdown} min-w-0 break-words text-sm text-general-foreground`}>
              <AgentMarkdown content={playbook.data.content} tableLabel="Customer agent playbook table" />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <BookOpenText className="size-6 text-general-muted-foreground" />
              <p className="text-sm font-medium text-general-foreground">No playbook yet</p>
            </div>
          )}
        </div>
      </section>
      </div>
    </AgentAttachmentsProvider>
  );
}
