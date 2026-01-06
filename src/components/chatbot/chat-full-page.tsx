"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { renderLightMarkdown } from "./markdown";
import type { ChatMessage, PanelPayload } from "./types";
import { sendChatbotMessage, simulateStreamingResponse } from "./chatbot-api";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { ReferencesMetadataTable } from "./references-metadata-table";

type UiMode = "full" | "split";

type PersistedChat = {
  conversationId: string | null;
  messages: ChatMessage[];
};

const PENDING_INPUT_KEY = "chatbot:pendingInput";

function storageKey(businessId: string) {
  return `massic:chatbot:${businessId}`;
}

function safeParseJson(value: string | null): PersistedChat | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as PersistedChat;
  } catch {
    return null;
  }
}

function persistChatSnapshot(
  businessId: string,
  conversationId: string | null,
  messages: ChatMessage[]
) {
  if (typeof window === "undefined") return;
  const payload: PersistedChat = {
    conversationId,
    messages: messages.slice(-60),
  };
  try {
    localStorage.setItem(storageKey(businessId), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function PanelView({ panel }: { panel: PanelPayload | null }) {
  if (!panel) return null;

  if (panel.type === "text") {
    return (
      <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{panel.data}</pre>
    );
  }

  if (panel.type === "references") {
    return <ReferencesMetadataTable references={panel.data} />;
  }

  if (panel.type !== "table") return null;

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {panel.data.columns.map((c) => (
              <TableHead key={c}>{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {panel.data.rows.map((r, idx) => (
            <TableRow key={idx}>
              {r.map((cell, i) => (
                <TableCell key={i} className="whitespace-pre-wrap wrap-break-word align-top">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm">
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

export function ChatFullPage({ businessId }: { businessId: string }) {
  const router = useRouter();

  const { profileData } = useBusinessProfileById(businessId || null);
  const businessName = profileData?.Name || profileData?.DisplayName || "Business";

  const [ui, setUi] = React.useState<UiMode>("full");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [activePanel, setActivePanel] = React.useState<PanelPayload | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const streamCleanupRef = React.useRef<null | (() => void)>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const persisted = safeParseJson(
      typeof window === "undefined" ? null : localStorage.getItem(storageKey(businessId))
    );

    if (persisted) {
      setConversationId(persisted.conversationId);
      setMessages(persisted.messages || []);
    } else {
      setConversationId(null);
      setMessages([]);
    }

    setActivePanel(null);
    setUi("full");
    setError(null);
    streamCleanupRef.current?.();
    streamCleanupRef.current = null;
  }, [businessId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const payload: PersistedChat = {
      conversationId,
      messages: messages.slice(-60),
    };

    try {
      localStorage.setItem(storageKey(businessId), JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [businessId, conversationId, messages]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, ui, activePanel]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    return () => {
      streamCleanupRef.current?.();
      streamCleanupRef.current = null;
    };
  }, []);

  const openPanel = (panel: PanelPayload) => {
    setActivePanel(panel);
    setUi("split");
  };

  const clearPanel = () => {
    setActivePanel(null);
    setUi("full");
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

    setMessages((prev) => {
      const next = [...prev, userMessage, botPlaceholder];
      persistChatSnapshot(businessId, conversationId, next);
      return next;
    });
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendChatbotMessage(
        text,
        businessId,
        conversationId || undefined
      );

      setConversationId(response.conversation_id);

      streamCleanupRef.current = simulateStreamingResponse(
        response,
        (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botPlaceholder.id
                ? { ...m, content: (m.content || "") + delta }
                : m
            )
          );
        },
        (finalMessage) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botPlaceholder.id
                ? { ...finalMessage, id: botPlaceholder.id }
                : m
            )
          );
          setIsLoading(false);
          streamCleanupRef.current = null;
        }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send message";
      setError(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botPlaceholder.id
            ? { ...m, content: "Sorry, I encountered an error. Please try again." }
            : m
        )
      );
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    await sendInPlace(text);
  };

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      let pendingRaw: string | null = null;
      try {
        pendingRaw = sessionStorage.getItem(PENDING_INPUT_KEY);
      } catch {
        pendingRaw = null;
      }

      const pending = pendingRaw?.trim();
      if (!pending) return;

      try {
        const persisted = safeParseJson(localStorage.getItem(storageKey(businessId)));
        const alreadyQueued = Boolean(
          persisted?.messages?.some(
            (m) => m.role === "user" && (m.content || "").trim() === pending
          )
        );
        if (alreadyQueued) {
          try {
            sessionStorage.removeItem(PENDING_INPUT_KEY);
          } catch {
            // ignore
          }
          return;
        }
      } catch {
        // ignore
      }

      if (cancelled) return;
      await sendInPlace(pending);
      try {
        sessionStorage.removeItem(PENDING_INPUT_KEY);
      } catch {
        // ignore
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // We intentionally do not depend on sendInPlace to avoid re-sending.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const backHref = `/business/${businessId}/analytics`;

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <Button variant="outline" size="sm" onClick={() => router.push(backHref)} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-2">Back</span>
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Image src="/AiStar.png" alt="Massic" width={18} height={18} />
              <div className="text-sm font-semibold">Ask Massic</div>
              <span className="truncate text-xs text-muted-foreground">· {businessName}</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">Click an assistant response to open details</div>
          </div>
        </div>
      </div>

      <div className={cn("mx-auto flex w-full max-w-5xl flex-1 min-h-0 overflow-hidden", ui === "split" ? "grid grid-cols-1 md:grid-cols-2" : "flex flex-col")}>
        <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="flex-1 h-full">
            <div className="space-y-4 px-4 py-5 sm:px-6 pb-8">

              {messages.map((m, idx) => {
                const isCallout = Boolean(m.callout);

                const isLoadingPlaceholder =
                  isLoading &&
                  m.role === "assistant" &&
                  (m.content || "").trim().length === 0 &&
                  !isCallout &&
                  idx === messages.length - 1;

                if (isLoadingPlaceholder) {
                  return <ThinkingBubble key={m.id} />;
                }

                return (
                  <div
                    key={m.id}
                    className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <button
                      type="button"
                      disabled={!isCallout}
                      onClick={() => (m.callout ? openPanel(m.callout.panel) : undefined)}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-left text-sm shadow-sm",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-foreground",
                        isCallout
                          ? "relative cursor-pointer pr-9 hover:bg-card/80"
                          : "cursor-default",
                        !isCallout ? "pointer-events-none" : "",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      )}
                      aria-label={
                        isCallout ? m.callout?.ctaLabel || "View details" : undefined
                      }
                    >
                      <div className="text-sm leading-relaxed">
                        {renderLightMarkdown(m.content)}
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
                  <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm">{error}</div>
                </div>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </div>

        {ui === "split" ? (
          <div className="hidden min-h-0 overflow-hidden border-l border-border bg-background md:flex md:flex-col">
            <div className="px-4 py-5 sm:px-6 flex-1 flex flex-col min-h-0">
              <Card className="rounded-2xl border-border flex flex-col h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
                  <CardTitle className="text-sm font-semibold">{activePanel?.title || "Details"}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={clearPanel}>
                    Close
                  </Button>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4 flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <PanelView panel={activePanel} />
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border bg-background">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Message</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 ">
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question…"
                  className="min-h-16 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  className="absolute bottom-2 right-2"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
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
              <div className="mt-2 text-xs text-muted-foreground">Press Enter to send · Shift+Enter for new line</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
