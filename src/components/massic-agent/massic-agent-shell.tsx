"use client";

import * as React from "react";
import { ChevronDown, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { AgentHistorySidebar } from "./agent-history-sidebar";
import { AgentChatThread } from "./agent-chat-thread";
import { AgentComposer } from "./agent-composer";
import { AgentEmptyState } from "./agent-empty-state";
import { AgentChatsListView } from "./agent-chats-list-view";
import { AgentSearchDialog } from "./agent-search-dialog";
import { deriveTitle, seedConversations, simulateAgentStream, type StreamHandle } from "./mock-data";
import type { AgentAction, AgentConversation, AgentMessage, StreamPhase } from "./types";

const STORAGE_KEY = "massic:agent:conversations";

function loadConversations(): AgentConversation[] {
  if (typeof window === "undefined") return seedConversations;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedConversations;
    const parsed = JSON.parse(raw) as AgentConversation[];
    if (!Array.isArray(parsed)) return seedConversations;
    return parsed;
  } catch {
    return seedConversations;
  }
}

function saveConversations(items: AgentConversation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function MassicAgentShell() {
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = React.useState<AgentConversation[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [streamPhase, setStreamPhase] = React.useState<StreamPhase>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  const [view, setView] = React.useState<"chat" | "chats">("chat");

  const streamRef = React.useRef<StreamHandle | null>(null);

  React.useEffect(() => {
    const initial = loadConversations();
    setConversations(initial);
    setActiveId(initial[0]?.id ?? null);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    saveConversations(conversations);
  }, [conversations, hydrated]);

  React.useEffect(() => {
    return () => {
      streamRef.current?.cancel();
      streamRef.current = null;
    };
  }, []);

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

  const activeConversation = React.useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const showEmptyState = !activeConversation || activeConversation.messages.length === 0;

  const updateConversation = React.useCallback(
    (id: string, updater: (c: AgentConversation) => AgentConversation) => {
      setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
    },
    []
  );

  const handleNewChat = () => {
    streamRef.current?.cancel();
    streamRef.current = null;
    setStreamPhase(null);
    setActiveId(null);
    setInput("");
    setView("chat");
  };

  const handleSelect = (id: string) => {
    streamRef.current?.cancel();
    streamRef.current = null;
    setStreamPhase(null);
    setActiveId(id);
    setView("chat");
  };

  const handleDelete = (id: string) => {
    streamRef.current?.cancel();
    streamRef.current = null;
    setStreamPhase(null);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const handleStop = () => {
    streamRef.current?.cancel();
    streamRef.current = null;
    setStreamPhase(null);
  };

  const startStream = (conversationId: string, assistantId: string) => {
    streamRef.current?.cancel();

    const patchMessage = (patcher: (m: AgentMessage) => AgentMessage) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== conversationId
            ? c
            : {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === assistantId ? patcher(m) : m
                ),
              }
        )
      );
    };

    streamRef.current = simulateAgentStream("", {
      onPhase: (phase) => setStreamPhase(phase),
      onThinking: (delta) => {
        patchMessage((m) => ({ ...m, thinking: (m.thinking || "") + delta }));
      },
      onAction: (action: AgentAction) => {
        patchMessage((m) => {
          const existing = m.actions || [];
          const found = existing.some((a) => a.id === action.id);
          const nextActions = found
            ? existing.map((a) => (a.id === action.id ? action : a))
            : [...existing, action];
          return { ...m, actions: nextActions };
        });
      },
      onActionDone: (id) => {
        patchMessage((m) => ({
          ...m,
          actions: (m.actions || []).map((a) =>
            a.id === id ? { ...a, status: "done" } : a
          ),
        }));
      },
      onDelta: (delta) => {
        patchMessage((m) => ({ ...m, content: (m.content || "") + delta }));
      },
      onDone: () => {
        setStreamPhase(null);
        streamRef.current = null;
      },
    });
  };

  const handleSend = (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;
    if (streamPhase !== null) return;

    setInput("");

    const now = Date.now();
    const userMsg: AgentMessage = {
      id: `u-${now}`,
      role: "user",
      content: text,
      createdAt: now,
    };
    const assistantMsg: AgentMessage = {
      id: `a-${now + 1}`,
      role: "assistant",
      content: "",
      thinking: "",
      actions: [],
      createdAt: now + 1,
    };

    let conversationId = activeId;

    if (!conversationId) {
      conversationId = `c-${now}`;
      const newConv: AgentConversation = {
        id: conversationId,
        title: deriveTitle(text),
        updatedAt: now,
        messages: [userMsg, assistantMsg],
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(conversationId);
    } else {
      updateConversation(conversationId, (c) => ({
        ...c,
        updatedAt: now,
        title: c.messages.length === 0 ? deriveTitle(text) : c.title,
        messages: [...c.messages, userMsg, assistantMsg],
      }));
    }

    startStream(conversationId, assistantMsg.id);
  };

  const handleRegenerate = () => {
    if (!activeConversation || streamPhase !== null) return;
    const lastAssistant = [...activeConversation.messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    updateConversation(activeConversation.id, (c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === lastAssistant.id
          ? { ...m, content: "", thinking: "", actions: [] }
          : m
      ),
    }));

    startStream(activeConversation.id, lastAssistant.id);
  };

  if (!hydrated) {
    return <div className="h-full w-full bg-background" />;
  }

  const userName = user?.username || user?.email;

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div
        className={cn(
          "shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden",
          sidebarOpen ? "w-[20%] min-w-[200px] max-w-[280px]" : "w-12"
        )}
      >
        <AgentHistorySidebar
          conversations={conversations}
          activeId={activeId}
          activeView={view}
          isCollapsed={!sidebarOpen}
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
        <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            {!showEmptyState && view === "chat" ? (
              <button
                type="button"
                className="flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-muted/60"
              >
                <span className="max-w-[320px] truncate">
                  {activeConversation?.title ?? "New chat"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            ) : null}
          </div>

          <div className="flex justify-center">
            <div className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground sm:flex">
              <span>Free plan</span>
              <span className="text-general-primary">·</span>
              <button type="button" className="font-medium text-general-primary hover:underline">
                Upgrade
              </button>
              <button type="button" aria-label="Dismiss" className="ml-1 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            {!showEmptyState && view === "chat" ? (
              <Button type="button" variant="outline" size="sm" className="gap-2" disabled>
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
            ) : null}
          </div>
        </header>

        <div className={cn("flex min-h-0 flex-1 flex-col")}>
          {view === "chats" ? (
            <AgentChatsListView
              conversations={conversations}
              onSelect={handleSelect}
              onNewChat={handleNewChat}
            />
          ) : showEmptyState ? (
            <AgentEmptyState
              value={input}
              onChange={setInput}
              onSend={handleSend}
              onStop={handleStop}
              isStreaming={streamPhase !== null}
              userName={userName ?? undefined}
            />
          ) : (
            <>
              <AgentChatThread
                messages={activeConversation?.messages ?? []}
                streamPhase={streamPhase}
                onRegenerate={handleRegenerate}
              />

              <div className="shrink-0 px-4 pb-4">
                <div className="mx-auto w-full max-w-3xl">
                  <AgentComposer
                    value={input}
                    onChange={setInput}
                    onSend={() => handleSend()}
                    onStop={handleStop}
                    isStreaming={streamPhase !== null}
                  />
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Massic is AI and can make mistakes. Please double-check responses.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
