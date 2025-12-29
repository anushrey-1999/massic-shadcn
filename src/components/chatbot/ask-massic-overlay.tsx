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
import type { ChatMessage, PanelPayload } from "./types";
import { sendChatbotMessage, simulateStreamingResponse } from "./chatbot-api";
import { X, Loader2 } from "lucide-react";
import type { AnchorRect } from "./ask-massic-overlay-provider";

type UiMode = "full" | "split";

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
    sessionStorage.setItem(storageKey(businessId), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function PanelView({ panel }: { panel: PanelPayload | null }) {
  if (!panel) return null;

  if (panel.type === "text") {
    return (
      <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {panel.data}
      </pre>
    );
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
                <td key={cellIndex} className="px-3 py-2 align-top whitespace-pre-wrap">
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
};

function ChatComposer({ value, onChange, onSend, isLoading }: ChatComposerProps) {
  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <Card className="border-none rounded-none py-4 flex items-center">
      <CardContent className="pt-0 max-w-[600px] w-full">
        <div className="relative bg-foreground-light p-2 rounded-xl">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ask me anything..."
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
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null);
  const prevOverflowRef = React.useRef<string | null>(null);
  const prevOverscrollRef = React.useRef<string | null>(null);

  const [ui, setUi] = React.useState<UiMode>("full");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [activePanel, setActivePanel] = React.useState<PanelPayload | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const streamCleanupRef = React.useRef<null | (() => void)>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);

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
        (portalTarget.style as any).overscrollBehavior = prevOverscrollRef.current;
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
  }, [open, businessId]);

  React.useEffect(() => {
    if (!open) return;
    persistChatSnapshot(businessId, conversationId, messages);
  }, [open, businessId, conversationId, messages]);

  React.useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);

    return () => clearTimeout(timer);
  }, [open, messages.length, ui, activePanel]);

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

  const title = businessName ? `Ask Massic · ${businessName}` : "Ask Massic";
  const showHero =
    messages.length === 0 && !isLoading && !error;

  if (!open) return null;

  const content = (
    <div className="absolute inset-0 z-50 bg-foreground-light" role="dialog" aria-label="Ask Massic">
      <div className="relative h-full w-full">
        <Button
          type="button"
          variant="outline"
          className={cn(
            "absolute z-10 gap-2 border-none shadow-none rounded-b-none text-general-foreground",
            connectedButtonStyle ? "right-4" : "top-4 right-4"
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

        <div className="absolute inset-0 p-4 pt-12 pb-0">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-tl-2xl shadow-xl bg-background">
            <div
              className={cn(
                "min-h-0 flex-1 overflow-hidden",
                ui === "split" ? "grid grid-cols-1 md:grid-cols-2" : "flex"
              )}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <ScrollArea className="flex-1 h-full">
                  <div className="space-y-4 px-5 py-5 pb-7">
                    {showHero ? (
                      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
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
                        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
                          {error}
                        </div>
                      </div>
                    ) : null}

                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>
              </div>

        {ui === "split" ? (
          <div className="hidden min-h-0 overflow-hidden border-l border-border bg-background md:flex md:flex-col">
            <div className="relative flex-1 min-h-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 z-10 h-8 w-8"
                onClick={clearPanel}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="h-full p-4">
                <ScrollArea className="h-full">
                  <PanelView panel={activePanel} />
                </ScrollArea>
              </div>
            </div>
          </div>
        ) : null}
            </div>

            <div className="shrink-0">
              <ChatComposer
                value={input}
                onChange={setInput}
                onSend={handleSend}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return portalTarget ? createPortal(content, portalTarget) : content;
}
