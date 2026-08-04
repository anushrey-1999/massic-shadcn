"use client";

import * as React from "react";
import { ArrowLeft, ChevronDown, X, Pencil, Check, Bot } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MassicLoader } from "@/components/ui/massic-loader";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useBusinessStore } from "@/store/business-store";
import { AgentHistorySidebar } from "./agent-history-sidebar";
import { AgentChatThread } from "./agent-chat-thread";
import { AgentComposer } from "./agent-composer";
import { AgentEmptyState } from "./agent-empty-state";
import { AgentChatsListView } from "./agent-chats-list-view";
import { AgentSearchDialog } from "./agent-search-dialog";
import { AgentArtifactPanel } from "./agent-artifact-panel";
import { useAgentStream } from "./use-agent-stream";
import {
  getThreads,
  getThreadMessages,
  getThreadCitations,
  renameThread,
  cancelTurn,
} from "./agent-api";
import type {
  AgentConversation,
  AgentMessage,
  AgentThread,
  SpecialistState,
  WidgetPart,
} from "./types";

const STORED_ANNOTATION_PREFIX = /\n\[(?:viewing|intent)\] /;
const DEFAULT_ARTIFACT_PANEL_WIDTH = 520;
const MIN_ARTIFACT_PANEL_WIDTH = 360;
const MAX_ARTIFACT_PANEL_WIDTH = 760;
const MIN_CHAT_PANEL_WIDTH = 420;

function displayUserMessageContent(content: string): string {
  const idx = content.search(STORED_ANNOTATION_PREFIX);
  return (idx === -1 ? content : content.slice(0, idx)).trimEnd();
}

function widgetPartsFromMetadata(metadata?: Record<string, unknown>): WidgetPart[] {
  const parts = metadata?.parts;
  if (!Array.isArray(parts)) return [];

  return parts.flatMap((part): WidgetPart[] => {
    if (!part || typeof part !== "object") return [];
    const raw = part as Record<string, unknown>;
    const resource = raw.resource as Record<string, unknown> | undefined;
    if (raw.kind !== "widget" || !resource?.type || resource.id == null) return [];
    const source = (raw.source ?? {}) as Record<string, unknown>;
    return [{
      kind: "widget",
      widget: String(raw.widget ?? ""),
      schema_version: Number(raw.schema_version ?? 1),
      source: {
        tool_call_id: String(source.tool_call_id ?? ""),
        tool_name: String(source.tool_name ?? ""),
      },
      resource: {
        type: String(resource.type),
        id: resource.id as string | number,
      },
    }];
  });
}

function threadToConversation(thread: AgentThread): AgentConversation {
  return {
    id: thread.thread_id,
    title: thread.title ?? "New chat",
    messages: [],
    updatedAt: new Date(thread.updated_at).getTime(),
  };
}

function threadMessageToAgentMessage(tm: {
  turn_id: string;
  role: "user" | "assistant";
  content: string;
  status: "complete" | "cancelled" | "error";
  metadata?: Record<string, unknown>;
  created_at: string;
}): AgentMessage {
  return {
    // turn_id is shared between user + assistant in the same turn — append role for a unique key
    id: `${tm.turn_id}-${tm.role}`,
    turnId: tm.turn_id,
    role: tm.role,
    content: tm.role === "user" ? displayUserMessageContent(tm.content) : tm.content,
    widgetParts: tm.role === "assistant" ? widgetPartsFromMetadata(tm.metadata) : undefined,
    createdAt: new Date(tm.created_at).getTime(),
    status: tm.status,
    partial: tm.status === "cancelled",
  };
}

type Props = {
  businessId?: string;
};

export function MassicAgentShell({ businessId: businessIdProp }: Props = {}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const storeBusinessId = useBusinessStore(
    (s) => s.profileDataByUniqueID?.UniqueId ?? ""
  );
  const businessId = businessIdProp || storeBusinessId;

  const [conversations, setConversations] = React.useState<AgentConversation[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [view, setView] = React.useState<"chat" | "chats">("chat");
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [threadCursor, setThreadCursor] = React.useState<string | null>(null);
  const [loadingMoreMessages, setLoadingMoreMessages] = React.useState(false);
  const [activeWidgetPart, setActiveWidgetPart] = React.useState<WidgetPart | null>(null);
  const [artifactPanelWidth, setArtifactPanelWidth] = React.useState(DEFAULT_ARTIFACT_PANEL_WIDTH);
  const splitContainerRef = React.useRef<HTMLDivElement | null>(null);

  // Rename UI state
  const [renamingTitle, setRenamingTitle] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const renameInputRef = React.useRef<HTMLInputElement | null>(null);

  // Track which thread we're currently streaming into
  const streamingConvIdRef = React.useRef<string | null>(null);
  const streamingMsgIdRef = React.useRef<string | null>(null);

  const agentStream = useAgentStream(businessId);

  // Load thread list on mount / when businessId changes
  React.useEffect(() => {
    if (!businessId) return;
    getThreads(businessId)
      .then((res) => {
        const convs = (res.threads ?? []).map(threadToConversation);
        setConversations(convs);
      })
      .catch((err) => {
        console.error("[agent] getThreads failed:", err);
        toast.error("Failed to load conversations");
      });
  }, [businessId]);

  // Keyboard shortcut for search
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus rename input when entering rename mode
  React.useEffect(() => {
    if (renamingTitle !== null) {
      setTimeout(() => renameInputRef.current?.focus(), 50);
    }
  }, [renamingTitle]);

  const activeConversation = React.useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  // Only show the empty/new-chat state when we're not in the middle of loading
  // an existing thread's messages. While loading, show a spinner instead.
  const showEmptyState =
    !messagesLoading &&
    (!activeConversation || activeConversation.messages.length === 0);

  const updateConversation = React.useCallback(
    (id: string, updater: (c: AgentConversation) => AgentConversation) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? updater(c) : c))
      );
    },
    []
  );

  const patchStreamingMessage = React.useCallback(
    (patcher: (m: AgentMessage) => AgentMessage) => {
      const convId = streamingConvIdRef.current;
      const msgId = streamingMsgIdRef.current;
      if (!convId || !msgId) return;
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === msgId ? patcher(m) : m
                ),
              }
        )
      );
    },
    []
  );

  const loadCitationsForMessages = React.useCallback(
    async (threadId: string, messages: AgentMessage[]) => {
      if (!businessId) return;
      const turnIds = Array.from(
        new Set(
          messages
            .filter((message) => message.role === "assistant" && message.turnId)
            .map((message) => message.turnId!)
        )
      );
      if (turnIds.length === 0) return;

      try {
        const citationsByTurn = await getThreadCitations(businessId, threadId, turnIds);
        updateConversation(threadId, (conversation) => ({
          ...conversation,
          messages: conversation.messages.map((message) => {
            if (!message.turnId || !(message.turnId in citationsByTurn)) return message;
            return {
              ...message,
              citations: citationsByTurn[message.turnId] ?? undefined,
            };
          }),
        }));
      } catch (err) {
        console.warn("[agent] getThreadCitations failed:", err);
      }
    },
    [businessId, updateConversation]
  );

  const handleNewChat = () => {
    agentStream.cancel();
    setActiveId(null);
    setInput("");
    setView("chat");
    setThreadCursor(null);
    setRenamingTitle(null);
    setActiveWidgetPart(null);
  };

  const handleSelect = async (id: string) => {
    if (id === activeId) {
      setView("chat");
      return;
    }
    agentStream.cancel();
    setActiveId(id);
    setView("chat");
    setThreadCursor(null);
    setRenamingTitle(null);
    setActiveWidgetPart(null);

    if (!businessId) return;
    setMessagesLoading(true);
    try {
      const res = await getThreadMessages(businessId, id);
      const msgs = [...res.messages]
        .reverse()
        .map(threadMessageToAgentMessage);
      setThreadCursor(res.next_cursor);
      updateConversation(id, (c) => ({ ...c, messages: msgs }));
      void loadCitationsForMessages(id, msgs);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "thread_not_found") {
        handleNewChat();
      } else if (code === "service_unavailable") {
        toast.error("Agent service temporarily unavailable.");
      } else {
        const detail = code ? ` (${code})` : "";
        toast.error(`Failed to load messages${detail}`);
        console.error("[agent] getThreadMessages failed:", err);
      }
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleLoadOlderMessages = React.useCallback(async () => {
    if (!activeId || !businessId || !threadCursor || loadingMoreMessages) return;
    setLoadingMoreMessages(true);
    try {
      const res = await getThreadMessages(businessId, activeId, threadCursor);
      const olderMsgs = [...res.messages]
        .reverse()
        .map(threadMessageToAgentMessage);
      setThreadCursor(res.next_cursor);
      updateConversation(activeId, (c) => ({
        ...c,
        messages: [...olderMsgs, ...c.messages],
      }));
      void loadCitationsForMessages(activeId, olderMsgs);
    } catch {
      toast.error("Failed to load older messages");
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [activeId, businessId, threadCursor, loadingMoreMessages, updateConversation]);

  const handleDelete = (id: string) => {
    agentStream.cancel();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
    if (activeId === id) setActiveWidgetPart(null);
  };

  const handleStop = async () => {
    const turnId = agentStream.getCurrentTurnId();
    const threadId = agentStream.getCurrentThreadId();
    agentStream.cancel();
    if (businessId && threadId && turnId) {
      await cancelTurn(businessId, threadId, turnId).catch(() => {});
    }
  };

  const handleSend = (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;
    if (agentStream.streamPhase !== null) return;
    if (!businessId) {
      toast.error("No business selected");
      return;
    }

    setInput("");

    const now = Date.now();
    const assistantMsgId = `a-${now}`;
    const userMsg: AgentMessage = {
      id: `u-${now}`,
      role: "user",
      content: text,
      createdAt: now,
    };
    const assistantMsg: AgentMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      thinking: "",
      actions: [],
      widgetParts: [],
      createdAt: now + 1,
    };

    let conversationId = activeId;

    if (!conversationId) {
      const tempId = `temp-${now}`;
      conversationId = tempId;
      const newConv: AgentConversation = {
        id: tempId,
        title: "New chat",
        updatedAt: now,
        messages: [userMsg, assistantMsg],
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(tempId);
    } else {
      updateConversation(conversationId, (c) => ({
        ...c,
        updatedAt: now,
        messages: [...c.messages, userMsg, assistantMsg],
      }));
    }

    streamingConvIdRef.current = conversationId;
    streamingMsgIdRef.current = assistantMsgId;

    agentStream.send(
      { message: text, threadId: activeId },
      {
        onThreadMeta: (threadId, turnId, isNew, title) => {
          const prevTempId = streamingConvIdRef.current;
          patchStreamingMessage((m) => ({ ...m, turnId }));
          streamingConvIdRef.current = threadId;

          if (isNew && prevTempId !== threadId) {
            // Replace temp conversation with real thread_id
            setConversations((prev) =>
              prev.map((c) =>
                c.id === prevTempId
                  ? {
                      ...c,
                      id: threadId,
                      title: title ?? c.title,
                      updatedAt: Date.now(),
                    }
                  : c
              )
            );
            setActiveId(threadId);
          } else if (title) {
            updateConversation(threadId, (c) => ({ ...c, title }));
          }
        },

        onThreadTitle: (threadId, title) => {
          setConversations((prev) =>
            prev.map((c) => (c.id === threadId ? { ...c, title } : c))
          );
        },

        onMessagePatch: patchStreamingMessage,

        onMessageCommit: (content, partial) => {
          patchStreamingMessage((m) => ({
            ...m,
            content,
            partial,
            status: partial ? "cancelled" : "complete",
          }));
        },

        onCitations: (turnId, segments) => {
          patchStreamingMessage((m) => ({
            ...m,
            turnId: m.turnId ?? turnId,
            citations: segments,
          }));
        },

        onToolCall: (toolName, widgetPart) => {
          const labels: Record<string, string> = {
            search_knowledge: "Searched knowledge base",
            get_business_profile: "Loaded business profile",
            get_strategy_statuses: "Checked strategy status",
            get_pages_details: "Fetched page details",
            get_webpage_plan: "Read content plan",
            recall_memory: "Retrieved memories",
            write_memory: "Saved memory",
            forget_memory: "Removed memory",
            save_plan: "Saved plan",
            activate_plan: "Activated plan",
          };
          const label = labels[toolName] ?? toolName.replace(/_/g, " ");
          patchStreamingMessage((m) => ({
            ...m,
            thinking: (m.thinking ? m.thinking + "\n\n" : "") + label,
            widgetParts: widgetPart
              ? [...(m.widgetParts ?? []), widgetPart]
              : m.widgetParts,
          }));
        },

        onWidgetParts: (parts) => {
          patchStreamingMessage((m) => ({
            ...m,
            widgetParts: parts,
          }));
        },

        onTurnEnd: () => {
          streamingConvIdRef.current = null;
          streamingMsgIdRef.current = null;
        },

        onCancelled: () => {
          patchStreamingMessage((m) => ({
            ...m,
            partial: true,
            status: "cancelled",
          }));
          streamingConvIdRef.current = null;
          streamingMsgIdRef.current = null;
        },

        onError: (code, message) => {
          patchStreamingMessage((m) => ({
            ...m,
            status: "error",
          }));
          streamingConvIdRef.current = null;
          streamingMsgIdRef.current = null;
          handleStreamError(code, message);
        },
      }
    );
  };

  function handleStreamError(code: string, message: string) {
    switch (code) {
      case "thread_not_found":
        handleNewChat();
        toast.error("Thread not found. Starting a new chat.");
        break;
      case "credit_exhausted":
        toast.error("Insufficient credits to continue.");
        break;
      case "turn_timeout":
        toast.error("Request took too long — please try again.");
        break;
      case "tool_limit_reached":
      case "max_iterations_reached":
        toast.error("Agent hit a limit — try a simpler request.");
        break;
      case "redis_unavailable":
      case "storage_unavailable":
        toast.error("Service temporarily unavailable. Please try again.");
        break;
      default:
        toast.error(message || "Something went wrong. Please try again.");
    }
  }

  const handleRenameStart = () => {
    if (!activeConversation) return;
    setRenamingTitle(activeConversation.id);
    setRenameValue(activeConversation.title);
  };

  const handleRenameConfirm = async () => {
    if (!renamingTitle || !businessId) {
      setRenamingTitle(null);
      return;
    }
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast.error("Title cannot be empty");
      return;
    }
    try {
      const updated = await renameThread(businessId, renamingTitle, trimmed);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === renamingTitle ? { ...c, title: updated.title ?? trimmed } : c
        )
      );
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "invalid_title") {
        toast.error("Invalid title — must be non-empty and under 200 characters.");
      } else if (code === "thread_not_found") {
        toast.error("Thread not found.");
      } else {
        toast.error("Failed to rename thread.");
      }
    } finally {
      setRenamingTitle(null);
    }
  };

  const handleRenameCancel = () => {
    setRenamingTitle(null);
  };

  const handleArtifactResizeStart = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();

      const containerWidth = splitContainerRef.current?.getBoundingClientRect().width;
      const maxWidth = containerWidth
        ? Math.max(
            MIN_ARTIFACT_PANEL_WIDTH,
            Math.min(MAX_ARTIFACT_PANEL_WIDTH, containerWidth - MIN_CHAT_PANEL_WIDTH)
          )
        : MAX_ARTIFACT_PANEL_WIDTH;
      const startX = event.clientX;
      const startWidth = artifactPanelWidth;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextWidth = startWidth - (moveEvent.clientX - startX);
        setArtifactPanelWidth(
          Math.min(Math.max(nextWidth, MIN_ARTIFACT_PANEL_WIDTH), maxWidth)
        );
      };

      const handlePointerUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
    },
    [artifactPanelWidth]
  );

  const userName = user?.username || user?.email;
  const isStreaming = agentStream.streamPhase !== null;
  const backHref = businessId ? `/business/${businessId}/analytics` : "/";

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div
        className={cn(
          "shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden",
          sidebarOpen ? "w-[240px]" : "w-12"
        )}
      >
        <AgentHistorySidebar
          conversations={conversations}
          activeId={activeId}
          activeView={view}
          isCollapsed={!sidebarOpen}
          specialistState={agentStream.specialistState}
          onSelect={handleSelect}
          onNewChat={handleNewChat}
          onDelete={handleDelete}
          onSearch={() => setSearchOpen(true)}
          onCollapse={() => setSidebarOpen(false)}
          onExpand={() => setSidebarOpen(true)}
          onChatsView={() => setView("chats")}
        />
      </div>

      <AgentSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        conversations={conversations}
        onSelect={handleSelect}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="h-14 shrink-0 px-4">
          <div className="mr-auto grid h-full w-full max-w-[1224px] grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push(backHref)}
              className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {!showEmptyState && view === "chat" ? (
              renamingTitle === activeConversation?.id ? (
                <div className="flex min-w-0 items-center gap-1.5">
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameConfirm();
                      if (e.key === "Escape") handleRenameCancel();
                    }}
                    className="min-w-0 max-w-[280px] rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-general-primary"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleRenameConfirm}
                    aria-label="Confirm rename"
                    className="h-7 w-7 text-general-primary"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleRenameCancel}
                    aria-label="Cancel rename"
                    className="h-7 w-7 text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRenameStart}
                  className="group flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-muted/60"
                >
                  <span className="max-w-[320px] truncate">
                    {activeConversation?.title ?? "New chat"}
                  </span>
                  <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              )
            ) : null}
            </div>

            <div className="flex justify-center gap-2">
            {agentStream.specialistState === "webpages" ? (
              <div className="flex items-center gap-1.5 rounded-full border border-general-primary/30 bg-general-primary/8 px-2.5 py-1 text-xs font-medium text-general-primary">
                <Bot className="h-3 w-3" />
                <span>Webpages agent</span>
              </div>
            ) : null}
            {/*
            <div className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground sm:flex">
              <span>Free plan</span>
              <span className="text-general-primary">·</span>
              <button
                type="button"
                className="font-medium text-general-primary hover:underline"
              >
                Upgrade
              </button>
              <button
                type="button"
                aria-label="Dismiss"
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            */}
            </div>

            <div />
          </div>
        </header>

        <div
          ref={splitContainerRef}
          className="mr-auto flex min-h-0 w-full max-w-[1224px] flex-1"
        >
          <div className={cn("flex min-w-0 flex-1 flex-col")}>
            {view === "chats" ? (
              <AgentChatsListView
                conversations={conversations}
                onSelect={handleSelect}
                onNewChat={handleNewChat}
              />
            ) : messagesLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <MassicLoader size={36} animate />
              </div>
            ) : showEmptyState ? (
              <AgentEmptyState
                value={input}
                onChange={setInput}
                onSend={handleSend}
                onStop={handleStop}
                isStreaming={isStreaming}
                userName={userName ?? undefined}
              />
            ) : (
              <>
                <AgentChatThread
                  messages={activeConversation?.messages ?? []}
                  streamPhase={agentStream.streamPhase}
                  activeToolName={agentStream.activeToolName}
                  align={activeWidgetPart ? "left" : "center"}
                  hasMore={!!threadCursor}
                  loadingMore={loadingMoreMessages}
                  onLoadMore={handleLoadOlderMessages}
                  onOpenWidget={setActiveWidgetPart}
                  onRegenerate={undefined}
                />

                <div className="shrink-0 px-4 pb-4">
                  <div
                    className={cn(
                      "w-full max-w-3xl",
                      !activeWidgetPart && "mx-auto"
                    )}
                  >
                    <AgentComposer
                      value={input}
                      onChange={setInput}
                      onSend={() => handleSend()}
                      onStop={handleStop}
                      isStreaming={isStreaming}
                    />
                    <p className="mt-2 text-center text-[11px] text-muted-foreground">
                      Massic is AI and can make mistakes. Please double-check
                      responses.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {view === "chat" && activeWidgetPart ? (
            <AgentArtifactPanel
              businessId={businessId}
              part={activeWidgetPart}
              onClose={() => setActiveWidgetPart(null)}
              width={artifactPanelWidth}
              onResizeStart={handleArtifactResizeStart}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
