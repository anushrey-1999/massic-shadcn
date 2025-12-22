"use client";

import * as React from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { renderLightMarkdown } from "./markdown";
import type { ChatMessage, PanelPayload } from "./types";
import { sendChatbotMessage, simulateStreamingResponse } from "./chatbot-api";
import { Loader2 } from "lucide-react";

type Props = {
  businessId?: string;
  businessName?: string;
};

type UiMode = "closed" | "open" | "split";

type PersistedChat = {
  conversationId: string | null;
  messages: ChatMessage[];
};

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

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-left text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Thinking…</span>
        </div>
        <div className="mt-2 space-y-2">
          <div className="h-2 w-36 rounded bg-background/60 animate-pulse" />
          <div className="h-2 w-52 rounded bg-background/60 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function ChatWidget({ businessId, businessName }: Props) {
  const params = useParams<{ id?: string }>();
  const effectiveBusinessId =
    businessId ?? (typeof params.id === "string" ? params.id : undefined);

  const [open, setOpen] = React.useState(false);
  const [ui, setUi] = React.useState<UiMode>("closed");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [activePanel, setActivePanel] = React.useState<PanelPayload | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const streamCleanupRef = React.useRef<null | (() => void)>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!effectiveBusinessId) {
      setConversationId(null);
      setMessages([]);
      setActivePanel(null);
      setUi(open ? "open" : "closed");
      setError("Business ID not available.");
      streamCleanupRef.current?.();
      streamCleanupRef.current = null;
      return;
    }

    const persisted = safeParseJson(
      typeof window === "undefined"
        ? null
        : localStorage.getItem(storageKey(effectiveBusinessId))
    );

    if (persisted) {
      setConversationId(persisted.conversationId);
      setMessages(persisted.messages || []);
    } else {
      setConversationId(null);
      setMessages([]);
    }

    setActivePanel(null);
    setUi(open ? "open" : "closed");
    setError(null);
    streamCleanupRef.current?.();
    streamCleanupRef.current = null;
  }, [effectiveBusinessId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (!effectiveBusinessId) return;
    const payload: PersistedChat = {
      conversationId,
      messages: messages.slice(-60),
    };
    try {
      localStorage.setItem(storageKey(effectiveBusinessId), JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [effectiveBusinessId, conversationId, messages]);

  React.useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [open, messages.length, ui, activePanel]);

  React.useEffect(() => {
    return () => {
      streamCleanupRef.current?.();
      streamCleanupRef.current = null;
    };
  }, []);

  const headerTitle = businessName
    ? `Ask Massic · ${businessName}`
    : "Ask Massic";

  const openPanel = (panel: PanelPayload) => {
    setActivePanel(panel);
    setUi("split");
  };

  const clearPanel = () => {
    setActivePanel(null);
    setUi("open");
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    if (!effectiveBusinessId) {
      setError("Business ID not available.");
      return;
    }

    streamCleanupRef.current?.();
    streamCleanupRef.current = null;

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

    setMessages((prev) => [...prev, userMessage, botPlaceholder]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendChatbotMessage(
        text,
        effectiveBusinessId,
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
            prev.map((m) => (m.id === botPlaceholder.id ? { ...finalMessage, id: m.id } : m))
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

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setOpen(true);
          setUi("open");
        }}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full p-0"
        aria-label="Ask Massic"
      >
        <span className="sr-only">Ask Massic</span>
        <Image src="/AiStar.png" alt="Massic" width={28} height={28} />
      </Button>

      <Sheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setUi("closed");
            setActivePanel(null);
          } else {
            setUi(activePanel ? "split" : "open");
          }
        }}
      >
        <SheetContent
          side="right"
          className={cn(
            "p-0",
            ui === "split" ? "w-[min(100vw,980px)]" : "w-[min(100vw,520px)]"
          )}
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="px-4 py-3">
              <SheetTitle className="flex items-center gap-2">
                <Image src="/AiStar.png" alt="Massic" width={20} height={20} />
                <span>{headerTitle}</span>
              </SheetTitle>
            </SheetHeader>
            <Separator />

            <div
              className={cn(
                "flex min-h-0 flex-1",
                ui === "split" ? "grid grid-cols-1 md:grid-cols-2" : "block"
              )}
            >
              <div className="flex min-h-0 flex-col">
                <ScrollArea className="flex-1 px-4 py-4">
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        Ask questions about this business.
                      </div>
                    ) : null}

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
                          className={cn(
                            "flex",
                            m.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          <button
                            type="button"
                            disabled={!isCallout}
                            onClick={() => (m.callout ? openPanel(m.callout.panel) : undefined)}
                            className={cn(
                              "max-w-[85%] rounded-2xl px-3 py-2 text-left text-sm",
                              m.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground",
                              isCallout
                                ? "relative cursor-pointer pr-8 hover:opacity-95"
                                : "cursor-default",
                              !isCallout ? "pointer-events-none" : ""
                            )}
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
                        <div className="rounded-2xl bg-muted px-3 py-2 text-sm">
                          {error}
                        </div>
                      </div>
                    ) : null}

                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>

                <Separator />

                <div className="p-4">
                  <div className="relative">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your question…"
                      className="min-h-[88px] pr-12"
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
                </div>
              </div>

              {ui === "split" ? (
                <div className="hidden min-h-0 border-l md:flex md:flex-col">
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="text-sm font-medium">{activePanel?.title || "Details"}</div>
                    <Button variant="ghost" size="sm" onClick={clearPanel}>
                      Close
                    </Button>
                  </div>
                  <Separator />
                  <ScrollArea className="flex-1 p-4">
                    {activePanel?.type === "text" ? (
                      <pre className="whitespace-pre-wrap text-sm text-foreground">
                        {activePanel.data}
                      </pre>
                    ) : null}
                  </ScrollArea>
                </div>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
