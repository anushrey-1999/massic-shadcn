"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { renderLightMarkdown } from "./markdown";
import type {
  ChatMessage,
  PanelPayload,
  ConversationPreview,
  ChatReference,
} from "./types";
import {
  sendChatbotMessage,
  sendPlannerMessage,
  simulateStreamingResponse,
  getConversationList,
  getChatHistory,
  getPlannerConversationList,
  getPlannerHistory,
} from "./chatbot-api";
import { X, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { ChatHistoryList } from "./chat-history-list";
import type { AnchorRect } from "./ask-massic-overlay-provider";
import { ReferencesMetadataTable } from "./references-metadata-table";
import { ArrowLeft } from "lucide-react";

type UiMode = "full" | "split";
type ChatMode = "chat" | "planner";

type PersistedChat = {
  conversationId: string | null;
  messages: ChatMessage[];
};

type PersistedConversationList = {
  ts: number;
  conversations: ConversationPreview[];
};

const HISTORY_CACHE_TTL_MS = 60_000;

function storageKey(businessId: string) {
  return `massic:chatbot:${businessId}`;
}

function plannerStorageKey(businessId: string) {
  return `massic:chatbot:planner:${businessId}`;
}

function historyCacheKey(businessId: string) {
  return `massic:chatbot:history:${businessId}`;
}

function plannerHistoryCacheKey(businessId: string) {
  return `massic:chatbot:planner-history:${businessId}`;
}

function plannerIdRegistryKey(businessId: string) {
  return `massic:chatbot:planner-ids:${businessId}`;
}
function safeParseHistory(
  value: string | null
): PersistedConversationList | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as PersistedConversationList;
    if (
      !parsed ||
      typeof parsed.ts !== "number" ||
      !Array.isArray(parsed.conversations)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readConversationListCache(
  businessId: string
): PersistedConversationList | null {
  if (typeof window === "undefined") return null;
  try {
    return safeParseHistory(
      sessionStorage.getItem(historyCacheKey(businessId))
    );
  } catch {
    return null;
  }
}

function readPlannerConversationListCache(
  businessId: string
): PersistedConversationList | null {
  if (typeof window === "undefined") return null;
  try {
    return safeParseHistory(
      sessionStorage.getItem(plannerHistoryCacheKey(businessId))
    );
  } catch {
    return null;
  }
}

function writeConversationListCache(
  businessId: string,
  conversations: ConversationPreview[]
) {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedConversationList = {
      ts: Date.now(),
      conversations,
    };
    sessionStorage.setItem(
      historyCacheKey(businessId),
      JSON.stringify(payload)
    );
  } catch {
    // ignore
  }
}

function writePlannerConversationListCache(
  businessId: string,
  conversations: ConversationPreview[]
) {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedConversationList = {
      ts: Date.now(),
      conversations,
    };
    sessionStorage.setItem(
      plannerHistoryCacheKey(businessId),
      JSON.stringify(payload)
    );
  } catch {
    // ignore
  }
}

function readPlannerIdRegistry(businessId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(plannerIdRegistryKey(businessId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writePlannerIdRegistry(businessId: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      plannerIdRegistryKey(businessId),
      JSON.stringify(Array.from(ids))
    );
  } catch {
    // ignore
  }
}
function safeParseJson(value: string | null): PersistedChat | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as PersistedChat;
  } catch {
    return null;
  }
}

function mergeConversationLists(
  chatItems: ConversationPreview[],
  plannerItems: ConversationPreview[],
  plannerIds: Set<string>
): ConversationPreview[] {
  const merged = new Map<string, ConversationPreview>();

  for (const item of chatItems) {
    merged.set(item.conv_id, item);
  }

  for (const item of plannerItems) {
    const existing = merged.get(item.conv_id);
    const shouldMarkPlanner = plannerIds.has(item.conv_id);
    if (existing) {
      merged.set(item.conv_id, {
        ...existing,
        ...item,
        kind: shouldMarkPlanner ? "planner" : existing.kind,
        title: item.title || existing.title,
      });
    } else {
      merged.set(item.conv_id, {
        ...item,
        kind: shouldMarkPlanner ? "planner" : "chat",
      });
    }
  }

  return Array.from(merged.values());
}

function normalizeReferences(references: ChatReference[]): ChatReference[] {
  return (references || [])
    .map((r) => {
      if (!r || typeof r !== "object") return undefined;
      const filename = typeof r.filename === "string" ? r.filename : undefined;
      const text = typeof r.text === "string" ? r.text : undefined;
      const metadata =
        r.metadata && typeof r.metadata === "object"
          ? (r.metadata as Record<string, unknown>)
          : undefined;
      return { filename, text, metadata } as ChatReference;
    })
    .filter(
      (r): r is ChatReference =>
        r !== undefined &&
        (r.filename !== undefined ||
          r.text !== undefined ||
          r.metadata !== undefined)
    );
}

function ensureMessageCallout(message: ChatMessage): ChatMessage {
  if (message.callout) {
    return message;
  }

  const msg = message as any;
  if (!msg.references || !Array.isArray(msg.references)) {
    return message;
  }

  const refs = msg.references;
  if (refs.length === 0) {
    return message;
  }

  const normalized = normalizeReferences(refs);
  const hasMetadata = normalized.some(
    (r) => r.metadata && Object.keys(r.metadata).length > 0
  );

  let callout: ChatMessage["callout"] | undefined;

  if (hasMetadata) {
    callout = {
      ctaLabel: "View sources",
      panel: { type: "references", title: "Sources", data: normalized },
    };
  } else {
    const referenceData = normalized
      .map((r) => String(r.text || r.filename || "").trim())
      .filter(Boolean)
      .join("\n");

    if (referenceData) {
      callout = {
        ctaLabel: "View sources",
        panel: { type: "text", title: "References", data: referenceData },
      };
    }
  }

  return { ...message, callout };
}

function formatPlannerContent(content: unknown): string {
  const parseJsonString = (value: string): unknown => {
    const trimmed = value.trim();
    const fenced = trimmed.startsWith("```")
      ? trimmed.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim()
      : trimmed;
    try {
      return JSON.parse(fenced);
    } catch {
      return value;
    }
  };

  if (typeof content === "string") {
    const parsed = parseJsonString(content);
    if (parsed !== content) return formatPlannerContent(parsed);
    return content;
  }
  if (!content || typeof content !== "object") return "No response received";

  const asAny = content as {
    plan_meta?: { focus_summary?: string };
    assumptions?: string[];
    page_ideas?: Array<{
      slot?: number;
      title?: string;
      page_type?: string;
      primary_intent?: string;
      brief?: string;
      why_now?: string;
      success_metric?: string;
      target_keywords_or_cluster?: string[];
    }>;
  };

  const lines: string[] = [];
  const focusSummary = asAny.plan_meta?.focus_summary;
  if (focusSummary) {
    lines.push("**Focus Summary:**");
    lines.push("");
    lines.push(focusSummary);
    lines.push("");
  }
  const assumptions = Array.isArray(asAny.assumptions) ? asAny.assumptions : [];
  const ideas = Array.isArray(asAny.page_ideas) ? asAny.page_ideas : [];

  if (assumptions.length > 0) {
    if (lines.length > 0 && lines[lines.length - 1] !== "") lines.push("");
    lines.push("**Assumptions:**");
    lines.push("");
    assumptions.forEach((item) => {
      if (item) lines.push(`- ${item}`);
    });
    lines.push("");
  }

  if (ideas.length > 0) {
    if (lines.length > 0 && lines[lines.length - 1] !== "") lines.push("");
    lines.push("**Page Ideas:**");
    lines.push("");
    ideas.forEach((idea, idx) => {
      const title = idea?.title || "Untitled";
      lines.push(`${idx + 1}. ${title}`);
      if (idea?.brief) lines.push(`${idea.brief}`);
      if (idea?.why_now) {
        lines.push("");
        lines.push("**Why now:**");
        lines.push("");
        lines.push(`${idea.why_now}`);
      }
      const keywords = Array.isArray(idea?.target_keywords_or_cluster)
        ? idea?.target_keywords_or_cluster.filter(Boolean).join(", ")
        : "";
      if (keywords) {
        lines.push("");
        lines.push("**Keywords:**");
        lines.push("");
        lines.push(`${keywords}`);
      }
      lines.push("");
    });
  }

  return lines.join("\n").trim() || "No response received";
}

function normalizePlannerHistoryMessage(message: ChatMessage): ChatMessage {
  if (typeof message.content === "string") return message;
  return { ...message, content: formatPlannerContent(message.content) };
}

function persistChatSnapshot(
  businessId: string,
  conversationId: string | null,
  messages: ChatMessage[]
) {
  if (typeof window === "undefined") return;
  const key = storageKey(businessId);

  // Don't persist an "empty" snapshot — it breaks reopening by making the UI
  // think there's an active chat, which hides the history list.
  if (!conversationId && messages.length === 0) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }

  const payload: PersistedChat = {
    conversationId,
    messages: messages.slice(-60),
  };
  try {
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function persistPlannerSnapshot(
  businessId: string,
  conversationId: string | null,
  messages: ChatMessage[]
) {
  if (typeof window === "undefined") return;
  const key = plannerStorageKey(businessId);

  if (!conversationId && messages.length === 0) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }

  const payload: PersistedChat = {
    conversationId,
    messages: messages.slice(-60),
  };
  try {
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore
  }
}
function PanelView({ panel }: { panel: PanelPayload | null }) {
  if (!panel) return null;

  if (panel.type === "text") {
    return (
      <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground font-mono overflow-x-auto">
        {panel.data}
      </pre>
    );
  }

  if (panel.type === "references") {
    return <ReferencesMetadataTable references={panel.data} />;
  }

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {panel.data.columns.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {panel.data.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/60">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-3 py-2 align-top whitespace-pre-wrap"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-xl rounded-bl-none border border-general-border bg-white px-4 py-3 text-left shadow-none">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Thinking…</span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-2 w-48 rounded bg-muted/60 animate-pulse" />
          <div className="h-2 w-64 rounded bg-muted/60 animate-pulse" />
          <div className="h-2 w-40 rounded bg-muted/60 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

type ChatComposerProps = {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  isLoading: boolean;
  placeholder?: string;
};

function ChatComposer({
  value,
  onChange,
  onSend,
  isLoading,
  placeholder,
}: ChatComposerProps) {
  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <Card className="border-none rounded-none py-4 flex items-center">
      <CardContent className="pt-0 max-w-[600px] w-full mx-auto">
        <div className="relative bg-foreground-light p-2 rounded-xl">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Ask me anything..."}
            className="min-h-[52px] max-h-24 resize-none overflow-y-auto pr-14 rounded-lg shadow-none border-none py-3.5 leading-6 placeholder:text-base md:placeholder:text-sm placeholder:leading-6"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 h-9 w-9"
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName?: string;
  anchorRect?: AnchorRect | null;
};

export function AskMassicOverlay({
  open,
  onOpenChange,
  businessId,
  businessName,
  anchorRect,
}: Props) {
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(
    null
  );
  const prevOverflowRef = React.useRef<string | null>(null);
  const prevOverscrollRef = React.useRef<string | null>(null);

  const [ui, setUi] = React.useState<UiMode>("full");
  const [activeMode, setActiveMode] = React.useState<ChatMode>("chat");
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [plannerMessages, setPlannerMessages] = React.useState<ChatMessage[]>(
    []
  );
  const [input, setInput] = React.useState("");
  const [activePanel, setActivePanel] = React.useState<PanelPayload | null>(
    null
  );
  const [isPanelFullscreen, setIsPanelFullscreen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [chatConversationId, setChatConversationId] = React.useState<
    string | null
  >(null);
  const [plannerConversationId, setPlannerConversationId] = React.useState<
    string | null
  >(null);
  const [error, setError] = React.useState<string | null>(null);

  // History state
  const [showHistory, setShowHistory] = React.useState(true);
  const [conversations, setConversations] = React.useState<
    ConversationPreview[]
  >([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyNextId, setHistoryNextId] = React.useState<string | null>(null);
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = React.useState(false);

  const streamCleanupRef = React.useRef<null | (() => void)>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const messagesScrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = React.useRef(0);
  const suppressNextAutoScrollRef = React.useRef(false);
  const savedScrollPositionRef = React.useRef<number | null>(null);
  const savedPanelScrollPositionRef = React.useRef<number | null>(null);

  const connectedButtonStyle = React.useMemo<
    React.CSSProperties | undefined
  >(() => {
    if (!anchorRect || !portalTarget) return undefined;
    const portalRect = portalTarget.getBoundingClientRect();
    const top = Math.max(0, anchorRect.top - portalRect.top);
    return { top };
  }, [anchorRect, portalTarget]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.querySelector<HTMLElement>(
      '[data-slot="sidebar-inset"]'
    );
    setPortalTarget(el);
  }, []);

  React.useEffect(() => {
    if (!portalTarget) return;
    const restore = () => {
      if (prevOverflowRef.current !== null) {
        portalTarget.style.overflow = prevOverflowRef.current;
        prevOverflowRef.current = null;
      }
      if (prevOverscrollRef.current !== null) {
        (portalTarget.style as any).overscrollBehavior =
          prevOverscrollRef.current;
        prevOverscrollRef.current = null;
      }
    };

    if (!open) {
      restore();
      return;
    }

    prevOverflowRef.current = portalTarget.style.overflow;
    prevOverscrollRef.current = (portalTarget.style as any).overscrollBehavior;

    portalTarget.style.overflow = "hidden";
    (portalTarget.style as any).overscrollBehavior = "none";

    return restore;
  }, [open, portalTarget]);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;

    // Session-only persistence: ensure any legacy localStorage snapshot doesn't
    // keep resurfacing old chats after refresh.
    try {
      localStorage.removeItem(storageKey(businessId));
    } catch {
      // ignore
    }

    const persisted = safeParseJson(
      typeof window === "undefined"
        ? null
        : sessionStorage.getItem(storageKey(businessId))
    );
    const plannerPersisted = safeParseJson(
      typeof window === "undefined"
        ? null
        : sessionStorage.getItem(plannerStorageKey(businessId))
    );


    const hasPersistedChat = Boolean(
      persisted &&
        ((persisted.conversationId && persisted.conversationId !== null) ||
          (Array.isArray(persisted.messages) && persisted.messages.length > 0))
    );

    if (hasPersistedChat) {
      setChatConversationId(persisted?.conversationId ?? null);
      setChatMessages((persisted?.messages || []).map(ensureMessageCallout));
      setShowHistory(false);
      setHistoryNextId(null);
      setActiveMode("chat");
    } else {
      // Clean up any empty/invalid persisted snapshot so the next open is correct.
      try {
        sessionStorage.removeItem(storageKey(businessId));
      } catch {
        // ignore
      }

      setChatConversationId(null);
      setChatMessages([]);
      setPlannerConversationId(null);
      setPlannerMessages([]);
      setShowHistory(true);
      setHistoryNextId(null);

      const cached = readConversationListCache(businessId);
      const plannerCached = readPlannerConversationListCache(businessId);
      const isCacheFresh = Boolean(
        cached && Date.now() - cached.ts <= HISTORY_CACHE_TTL_MS
      );
      const isPlannerCacheFresh = Boolean(
        plannerCached && Date.now() - plannerCached.ts <= HISTORY_CACHE_TTL_MS
      );

      const plannerIds = readPlannerIdRegistry(businessId);
      if (cached || plannerCached) {
        const chatItems = (cached?.conversations || []).map((c) => ({
          ...c,
          kind: "chat" as const,
        }));
        const plannerItems = (plannerCached?.conversations || []).map((c) => ({
          ...c,
          kind: "planner" as const,
        }));
        setConversations(
          mergeConversationLists(chatItems, plannerItems, plannerIds)
        );
        setHistoryLoading(false);
      } else {
        setConversations([]);
        setHistoryLoading(true);
      }

      void getConversationList(businessId)
        .then((data) => {
          if (cancelled) return;
          const next = (data.conversations || []).map((c) => ({
            ...c,
            kind: "chat" as const,
          }));
          setConversations((prev) => {
            const plannerItems = prev.filter((c) => c.kind === "planner");
            return mergeConversationLists(
              next,
              plannerItems,
              readPlannerIdRegistry(businessId)
            );
          });
          writeConversationListCache(businessId, data.conversations || []);
        })
        .catch((err) => {
          console.error("Failed to load conversation list:", err);
          if (cancelled) return;
          if (!cached) {
            setConversations((prev) => prev.filter((c) => c.kind === "planner"));
          }
        })
        .finally(() => {
          if (cancelled) return;
          if (!cached || !isCacheFresh) setHistoryLoading(false);
        });

      void getPlannerConversationList(businessId)
        .then((data) => {
          if (cancelled) return;
          const next = (data.conversations || []).map((c) => ({
            ...c,
            kind: "planner" as const,
          }));
          setConversations((prev) => {
            const chatItems = prev.filter((c) => c.kind === "chat");
            return mergeConversationLists(
              chatItems,
              next,
              readPlannerIdRegistry(businessId)
            );
          });
          writePlannerConversationListCache(businessId, data.conversations || []);
        })
        .catch((err) => {
          console.error("Failed to load planner conversation list:", err);
          if (cancelled) return;
          if (!plannerCached) {
            setConversations((prev) => prev.filter((c) => c.kind === "chat"));
          }
        })
        .finally(() => {
          if (cancelled) return;
          if (!plannerCached || !isPlannerCacheFresh) setHistoryLoading(false);
        });
    }

    if (plannerPersisted) {
      setPlannerConversationId(plannerPersisted.conversationId ?? null);
      setPlannerMessages(
        (plannerPersisted.messages || []).map(ensureMessageCallout)
      );
    }

    setActivePanel(null);
    setUi("full");
    setError(null);
    streamCleanupRef.current?.();
    streamCleanupRef.current = null;

    return () => {
      cancelled = true;
    };
  }, [open, businessId]);

  const loadMoreHistory = React.useCallback(async () => {
    if (showHistory) return;
    const activeConversationId =
      activeMode === "planner" ? plannerConversationId : chatConversationId;
    if (!activeConversationId) return;
    if (!historyNextId) return;
    if (isLoadingMoreHistory) return;

    const container = messagesScrollContainerRef.current;
    const viewport = container?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );

    setIsLoadingMoreHistory(true);
    const prevScrollHeight = viewport?.scrollHeight ?? 0;
    const prevScrollTop = viewport?.scrollTop ?? 0;

    try {
      const historyData =
        activeMode === "planner"
          ? await getPlannerHistory(
              businessId,
              activeConversationId,
              historyNextId
            )
          : await getChatHistory(businessId, activeConversationId, historyNextId);

      const baseTimestamp = Date.now();
      const chunk = historyData.messages || [];
      const chunkWithIds = chunk
        .reverse()
        .map((msg, idx) => ({
          ...msg,
          id:
            msg.id ||
            `msg-${activeConversationId}-${historyNextId}-${baseTimestamp}-${idx}`,
        }))
        .map(ensureMessageCallout)
        .map((msg) =>
          activeMode === "planner" ? normalizePlannerHistoryMessage(msg) : msg
        );

      suppressNextAutoScrollRef.current = true;
      if (activeMode === "planner") {
        setPlannerMessages((prev) => [...chunkWithIds, ...prev]);
      } else {
        setChatMessages((prev) => [...chunkWithIds, ...prev]);
      }
      setHistoryNextId(historyData.next_id ?? null);

      if (viewport) {
        requestAnimationFrame(() => {
          const nextScrollHeight = viewport.scrollHeight;
          const delta = nextScrollHeight - prevScrollHeight;
          viewport.scrollTop = prevScrollTop + delta;
        });
      }
    } catch (err) {
      console.error("Failed to load more chat history:", err);
    } finally {
      setIsLoadingMoreHistory(false);
    }
  }, [
    businessId,
    chatConversationId,
    plannerConversationId,
    historyNextId,
    isLoadingMoreHistory,
    activeMode,
    showHistory,
  ]);

  React.useEffect(() => {
    if (showHistory) return;
    if (!historyNextId) return;

    const container = messagesScrollContainerRef.current;
    const viewport = container?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (!viewport) return;

    lastScrollTopRef.current = viewport.scrollTop;

    const onScroll = () => {
      if (!historyNextId || isLoadingMoreHistory) return;
      const currentTop = viewport.scrollTop;
      const wasTop = lastScrollTopRef.current;
      const isScrollingUp = currentTop < wasTop;
      lastScrollTopRef.current = currentTop;

      if (isScrollingUp && currentTop <= 40) {
        void loadMoreHistory();
      }
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [historyNextId, isLoadingMoreHistory, loadMoreHistory, showHistory]);

  React.useEffect(() => {
    if (!open) return;
    persistChatSnapshot(businessId, chatConversationId, chatMessages);
  }, [open, businessId, chatConversationId, chatMessages]);

  React.useEffect(() => {
    if (!open) return;
    persistPlannerSnapshot(
      businessId,
      plannerConversationId,
      plannerMessages
    );
  }, [open, businessId, plannerConversationId, plannerMessages]);

  React.useEffect(() => {
    if (!open) return;

    if (suppressNextAutoScrollRef.current) {
      suppressNextAutoScrollRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);

    return () => clearTimeout(timer);
  }, [
    open,
    chatMessages.length,
    plannerMessages.length,
    ui,
    activePanel,
    activeMode,
  ]);

  React.useEffect(() => {
    if (isPanelFullscreen) return;
    if (savedScrollPositionRef.current === null) return;

    const container = messagesScrollContainerRef.current;
    if (!container) return;

    suppressNextAutoScrollRef.current = true;

    const restoreScroll = () => {
      const viewport = container.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]'
      );
      if (viewport && savedScrollPositionRef.current !== null) {
        viewport.scrollTop = savedScrollPositionRef.current;
        savedScrollPositionRef.current = null;
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(restoreScroll);
    });
  }, [isPanelFullscreen]);

  React.useEffect(() => {
    return () => {
      streamCleanupRef.current?.();
      streamCleanupRef.current = null;
    };
  }, []);

  const addPlannerConversationId = React.useCallback(
    (convId: string) => {
      const next = readPlannerIdRegistry(businessId);
      if (!next.has(convId)) {
        next.add(convId);
        writePlannerIdRegistry(businessId, next);
      }
    },
    [businessId]
  );

  const openPanel = (panel: PanelPayload) => {
    // Save scroll position before opening panel
    const container = messagesScrollContainerRef.current;
    const viewport = container?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (viewport) {
      savedPanelScrollPositionRef.current = viewport.scrollTop;
    }
    suppressNextAutoScrollRef.current = true;
    setActivePanel(panel);
    setUi("split");
  };

  const clearPanel = () => {
    const scrollPositionToRestore = savedPanelScrollPositionRef.current;
    setActivePanel(null);
    setUi("full");
    setIsPanelFullscreen(false);
    
    // Restore scroll position after closing panel
    if (scrollPositionToRestore !== null) {
      suppressNextAutoScrollRef.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = messagesScrollContainerRef.current;
          const viewport = container?.querySelector<HTMLElement>(
            '[data-slot="scroll-area-viewport"]'
          );
          if (viewport) {
            viewport.scrollTop = scrollPositionToRestore;
          }
          savedPanelScrollPositionRef.current = null;
        });
      });
    } else {
      savedPanelScrollPositionRef.current = null;
    }
  };

  const handleToggleFullscreen = () => {
    if (!isPanelFullscreen) {
      // Entering fullscreen - save scroll position
      const container = messagesScrollContainerRef.current;
      const viewport = container?.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]'
      );
      if (viewport) {
        savedScrollPositionRef.current = viewport.scrollTop;
      }
    }
    setIsPanelFullscreen(!isPanelFullscreen);
  };

  const sendInPlace = async (text: string) => {
    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };

    const botPlaceholder: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: "",
    };

    streamCleanupRef.current?.();
    streamCleanupRef.current = null;

    if (activeMode === "planner") {
      setPlannerMessages((prev) => [...prev, userMessage, botPlaceholder]);
    } else {
      setChatMessages((prev) => {
        const next = [...prev, userMessage, botPlaceholder];
        persistChatSnapshot(businessId, chatConversationId, next);
        return next;
      });
    }

    setIsLoading(true);
    setError(null);

    try {
      const response =
        activeMode === "planner"
          ? await sendPlannerMessage(
              text,
              businessId,
              plannerConversationId || undefined
            )
          : await sendChatbotMessage(
              text,
              businessId,
              chatConversationId || undefined
            );

      if (activeMode === "planner") {
        setPlannerConversationId(response.conversation_id);
        addPlannerConversationId(response.conversation_id);
        setConversations((prev) =>
          prev.map((conv) =>
            conv.conv_id === response.conversation_id
              ? { ...conv, kind: "planner" }
              : conv
          )
        );
      } else {
        setChatConversationId(response.conversation_id);
      }

      streamCleanupRef.current = simulateStreamingResponse(
        response,
        (delta) => {
          if (activeMode === "planner") {
            setPlannerMessages((prev) =>
              prev.map((m) =>
                m.id === botPlaceholder.id
                  ? { ...m, content: (m.content || "") + delta }
                  : m
              )
            );
          } else {
            setChatMessages((prev) =>
              prev.map((m) =>
                m.id === botPlaceholder.id
                  ? { ...m, content: (m.content || "") + delta }
                  : m
              )
            );
          }
        },
        (finalMessage) => {
          console.log("Final message received:", finalMessage);
          if (activeMode === "planner") {
            setPlannerMessages((prev) =>
              prev.map((m) => {
                if (m.id === botPlaceholder.id) {
                  const updated = { ...finalMessage, id: botPlaceholder.id };
                  console.log("Updating message with final:", updated);
                  return updated;
                }
                return m;
              })
            );
          } else {
            setChatMessages((prev) =>
              prev.map((m) => {
                if (m.id === botPlaceholder.id) {
                  const updated = { ...finalMessage, id: botPlaceholder.id };
                  console.log("Updating message with final:", updated);
                  return updated;
                }
                return m;
              })
            );
          }
          setIsLoading(false);
          streamCleanupRef.current = null;
        }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send message";
      setError(msg);
      if (activeMode === "planner") {
        setPlannerMessages((prev) =>
          prev.map((m) =>
            m.id === botPlaceholder.id
              ? {
                  ...m,
                  content: "Sorry, I encountered an error. Please try again.",
                }
              : m
          )
        );
      } else {
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === botPlaceholder.id
              ? {
                  ...m,
                  content: "Sorry, I encountered an error. Please try again.",
                }
              : m
          )
        );
      }
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setHistoryNextId(null);

    // Exit fullscreen if active when sending a message
    if (isPanelFullscreen) {
      setIsPanelFullscreen(false);
    }

    // Switch from history view to chat view when starting a new conversation
    if (showHistory) {
      setShowHistory(false);
    }

    await sendInPlace(text);
  };

  const handleSelectConversation = async (convId: string, mode: ChatMode) => {
    setHistoryLoading(true);
    try {
      const historyData =
        mode === "planner"
          ? await getPlannerHistory(businessId, convId)
          : await getChatHistory(businessId, convId);
      // Ensure each message has a unique ID and reverse order if needed
      const baseTimestamp = Date.now();
      const messages = historyData.messages || [];

      // Reverse the messages array so they appear in chronological order (oldest first)
      const messagesWithIds = messages
        .reverse()
        .map((msg, idx) => ({
          ...msg,
          id: msg.id || `msg-${convId}-${baseTimestamp}-${idx}`,
        }))
        .map(ensureMessageCallout)
        .map((msg) =>
          mode === "planner" ? normalizePlannerHistoryMessage(msg) : msg
        );

      if (mode === "planner") {
        setPlannerMessages(messagesWithIds);
        setPlannerConversationId(convId);
        addPlannerConversationId(convId);
        setConversations((prev) =>
          prev.map((conv) =>
            conv.conv_id === convId ? { ...conv, kind: "planner" } : conv
          )
        );
      } else {
        setChatMessages(messagesWithIds);
        setChatConversationId(convId);
      }
      setHistoryNextId(historyData.next_id ?? null);
      setActiveMode(mode);
      setShowHistory(false);
      setError(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load conversation";
      setError(msg);
      console.error("Failed to load chat history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleBackToHistory = () => {
    setChatConversationId(null);
    setChatMessages([]);
    setPlannerConversationId(null);
    setPlannerMessages([]);
    setShowHistory(true);
    setInput("");
    setError(null);
    setHistoryNextId(null);
    setIsLoadingMoreHistory(false);
    setActivePanel(null);
    setUi("full");

    const cached = readConversationListCache(businessId);
    const plannerCached = readPlannerConversationListCache(businessId);
    const plannerIds = readPlannerIdRegistry(businessId);
    if (cached || plannerCached) {
      const chatItems = (cached?.conversations || []).map((c) => ({
        ...c,
        kind: "chat" as const,
      }));
      const plannerItems = (plannerCached?.conversations || []).map((c) => ({
        ...c,
        kind: "planner" as const,
      }));
      setConversations(
        mergeConversationLists(chatItems, plannerItems, plannerIds)
      );
      setHistoryLoading(false);
    } else {
      setConversations([]);
      setHistoryLoading(true);
    }

    void getConversationList(businessId)
      .then((data) => {
        const next = (data.conversations || []).map((c) => ({
          ...c,
          kind: "chat" as const,
        }));
        setConversations((prev) => {
          const plannerItems = prev.filter((c) => c.kind === "planner");
          return mergeConversationLists(
            next,
            plannerItems,
            readPlannerIdRegistry(businessId)
          );
        });
        writeConversationListCache(businessId, data.conversations || []);
      })
      .catch((err) => {
        console.error("Failed to load conversation list:", err);
        if (!cached) {
          setConversations((prev) => prev.filter((c) => c.kind === "planner"));
        }
      })
      .finally(() => {
        if (!cached) setHistoryLoading(false);
      });

    void getPlannerConversationList(businessId)
      .then((data) => {
        const next = (data.conversations || []).map((c) => ({
          ...c,
          kind: "planner" as const,
        }));
        setConversations((prev) => {
          const chatItems = prev.filter((c) => c.kind === "chat");
          return mergeConversationLists(
            chatItems,
            next,
            readPlannerIdRegistry(businessId)
          );
        });
        writePlannerConversationListCache(businessId, data.conversations || []);
      })
      .catch((err) => {
        console.error("Failed to load planner conversation list:", err);
        if (!plannerCached) {
          setConversations((prev) => prev.filter((c) => c.kind === "chat"));
        }
      })
      .finally(() => {
        if (!plannerCached) setHistoryLoading(false);
      });
  };

  const title = businessName ? `Ask Massic · ${businessName}` : "Ask Massic";

  if (!open) return null;

  const activeMessages =
    activeMode === "planner" ? plannerMessages : chatMessages;

  const content = (
    <div
      className="absolute inset-0 z-50 bg-foreground-light"
      role="dialog"
      aria-label="Ask Massic"
    >
      <div className="relative h-full w-full max-w-[1224px]">
        <Button
          type="button"
          variant="outline"
          className={cn(
            "absolute z-10 gap-2 border-none shadow-none rounded-b-none text-general-foreground",
            connectedButtonStyle ? "right-5" : "top-4 right-5"
          )}
          style={connectedButtonStyle}
          onClick={() => {
            streamCleanupRef.current?.();
            streamCleanupRef.current = null;
            setIsLoading(false);
            onOpenChange(false);
          }}
          aria-label="Close Ask Massic"
        >
          <Image
            src="/massic-icon-green.svg"
            alt="Massic"
            width={18}
            height={18}
          />
          <span className="bg-linear-to-r from-general-primary to-general-primary-gradient-to bg-clip-text text-transparent">
            Ask Massic
          </span>
          <X className="h-4 w-4" />
        </Button>

        <div className="absolute inset-0 px-5 pb-0 pt-12">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-tl-2xl shadow-xl bg-background">
            {!showHistory && activeMessages.length > 0 && !isPanelFullscreen && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBackToHistory}
                className="absolute left-4 top-4 z-20 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft />
              </Button>
            )}
            <div
              className={cn(
                "min-h-0 flex-1 overflow-hidden w-full",
                ui === "split" && !isPanelFullscreen ? "max-w-[1136px] mx-auto" : "",
                ui === "split" && !isPanelFullscreen ? "grid grid-cols-1 md:grid-cols-2" : "flex"
              )}
            >
              {!isPanelFullscreen && (
                <div
                  ref={messagesScrollContainerRef}
                  className="flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                <ScrollArea className="flex-1 h-full">
                  <div
                    className={cn(
                      "space-y-4 px-2 py-5 pb-7 w-full",
                      ui === "split" ? "" : "max-w-[552px] mx-auto"
                    )}
                  >
                    {showHistory ? (
                      <div className="flex min-h-[80vh] flex-col items-center justify-center text-center ">
                        <div className="flex flex-col items-center pt-8 pb-8 ">
                          <Image
                            src="/massic-logo-green.svg"
                            alt="Massic"
                            width={40}
                            height={40}
                          />
                          <Typography
                            variant="h2"
                            className="mt-2.5 bg-linear-to-r from-general-primary to-general-primary-gradient-to bg-clip-text text-transparent"
                          >
                            Ask Massic anything.
                          </Typography>
                          <div className="mt-1 max-w-xl text-base text-general-muted-foreground">
                            Tell me what you want to grow. I'll handle the rest.
                          </div>
                        </div>
                        <div className="w-full max-w-[552px]  mx-auto max-h-[50vh] overflow-auto flex flex-col flex-1 min-h-0">
                          {historyLoading ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                              <span className="text-sm text-muted-foreground">
                                Loading conversation...
                              </span>
                            </div>
                          ) : (
                            <ScrollArea className="flex-1 min-h-0 overflow-auto">
                              <ChatHistoryList
                                conversations={conversations}
                                isLoading={false}
                                onSelectConversation={handleSelectConversation}
                              />
                            </ScrollArea>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {!showHistory && isLoadingMoreHistory ? (
                      <div className="flex justify-center py-1">
                        <span className="text-xs text-muted-foreground">
                          Loading more…
                        </span>
                      </div>
                    ) : null}

                    {activeMessages.map((m, idx) => {
                      const isCallout = Boolean(m.callout);
                      const displayContent =
                        activeMode === "planner" && m.role === "assistant"
                          ? formatPlannerContent(m.content)
                          : m.content;

                      const isLoadingPlaceholder =
                        isLoading &&
                        m.role === "assistant" &&
                        (m.content || "").trim().length === 0 &&
                        !isCallout &&
                        idx === activeMessages.length - 1;

                      if (isLoadingPlaceholder) {
                        return <ThinkingBubble key={m.id} />;
                      }

                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex",
                            m.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          <button
                            type="button"
                            disabled={!isCallout}
                            onClick={() =>
                              m.callout ? openPanel(m.callout.panel) : undefined
                            }
                            className={cn(
                              "max-w-[85%] rounded-xl px-4 py-3 text-left text-sm shadow-none",
                              m.role === "user"
                                ? "bg-foreground-light text-general-foreground border-0 rounded-br-none"
                                : "border border-general-border bg-white text-general-muted-foreground rounded-bl-none",
                              isCallout
                                ? m.role === "user"
                                  ? "relative cursor-pointer pr-9"
                                  : "relative cursor-pointer pr-9 transition-colors hover:bg-general-primary-foreground"
                                : "cursor-default",
                              !isCallout ? "pointer-events-none" : "",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            )}
                            aria-label={
                              isCallout
                                ? m.callout?.ctaLabel || "View details"
                                : undefined
                            }
                          >
                            <div className="text-sm leading-relaxed">
                              {renderLightMarkdown(displayContent)}
                            </div>
                            {isCallout ? (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                →
                              </span>
                            ) : null}
                          </button>
                        </div>
                      );
                    })}

                    {error ? (
                      <div className="flex justify-start">
                        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
                          {error}
                        </div>
                      </div>
                    ) : null}

                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>
              </div>
              )}

              {ui === "split" ? (
                <div
                  className={cn(
                    "min-h-0 overflow-hidden bg-background",
                    isPanelFullscreen ? "flex flex-col w-full" : "hidden md:flex md:flex-col"
                  )}
                >
                  <div className="relative flex-1 pr-4 min-h-0">
                    <div className="absolute right-0 top-3 z-20 flex gap-2">
                      {(activePanel?.type === "references" || 
                        (activePanel?.type === "text" && activePanel?.title === "References")) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleToggleFullscreen}
                          aria-label={isPanelFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                        >
                          {isPanelFullscreen ? (
                            <Minimize2 className="h-4 w-4" />
                          ) : (
                            <Maximize2 className="h-4 w-4" />
                          )}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={clearPanel}
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="h-full p-0 pt-12">
                      {activePanel?.type === "references" ? (
                        <div className="h-full">
                          <PanelView panel={activePanel} />
                        </div>
                      ) : (
                        <ScrollArea className="h-full">
                          <PanelView panel={activePanel} />
                        </ScrollArea>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="shrink-0">
              {showHistory ? (
                <div className="max-w-[600px] w-full mx-auto px-6 pb-2">
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                      activeMode === "planner"
                        ? "border-general-primary bg-general-primary-foreground text-general-foreground"
                        : "border-general-border bg-background text-muted-foreground hover:text-general-foreground"
                    )}
                    onClick={() =>
                      setActiveMode((prev) =>
                        prev === "planner" ? "chat" : "planner"
                      )
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">Planner</div>
                      <span className="text-xs">
                        {activeMode === "planner"
                          ? "Back to chat"
                          : "Start planning"}
                      </span>
                    </div>
                  </button>
                </div>
              ) : null}
              <ChatComposer
                value={input}
                onChange={setInput}
                onSend={handleSend}
                isLoading={isLoading}
                placeholder={
                  activeMode === "planner"
                    ? "Ask for a plan..."
                    : "Ask me anything..."
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return portalTarget ? createPortal(content, portalTarget) : content;
}
