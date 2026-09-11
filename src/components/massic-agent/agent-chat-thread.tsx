"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentMessageView } from "./agent-message";
import type { AgentMessage, ResourceRef } from "./types";
export function AgentChatThread({ messages, streaming, activeResource, onOpenPlan, hasMore, loadingMore, onLoadMore }: { messages: AgentMessage[]; streaming: boolean; activeResource: ResourceRef | null; onOpenPlan: (resource: ResourceRef) => void; hasMore: boolean; loadingMore: boolean; onLoadMore: () => void }) {
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const olderHeight = useRef<number | null>(null);
  const [away, setAway] = useState(false);
  useLayoutEffect(() => {
    const el = scroll.current; if (!el) return;
    if (olderHeight.current !== null && !loadingMore) { el.scrollTop += el.scrollHeight - olderHeight.current; olderHeight.current = null; }
    else if (follow.current) el.scrollTop = el.scrollHeight;
  }, [messages, loadingMore]);
  return <div className="relative min-h-0 flex-1"><div ref={scroll} className="h-full overflow-y-auto overscroll-contain" onScroll={() => { const el = scroll.current!; follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; setAway(!follow.current); }}>
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6">{hasMore && <div className="text-center"><Button variant="ghost" size="sm" disabled={loadingMore} onClick={() => { olderHeight.current = scroll.current?.scrollHeight ?? null; onLoadMore(); }}>{loadingMore ? "Loading…" : "Load older messages"}</Button></div>}
      {messages.map((message, i) => <AgentMessageView key={message.id} message={message} streaming={streaming && i === messages.length - 1} activeResource={activeResource} onOpenPlan={onOpenPlan} />)}
    </div>
  </div>{away && <Button variant="outline" size="icon-sm" className="absolute bottom-4 left-1/2 rounded-full bg-background shadow-md transition-shadow hover:shadow-lg" aria-label="Jump to latest message" onClick={() => { const el = scroll.current; if (el) { el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); follow.current = true; } }}><ArrowDown className="h-4 w-4" /></Button>}</div>;
}
