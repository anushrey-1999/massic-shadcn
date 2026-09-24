"use client";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import styles from "./agent.module.css";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentMessageView } from "./agent-message";
import type { ChatEntry, ResourceRef } from "./types";

export function AgentChatThread({ messages, streaming, activeResource, onOpenPlan, hasMore, loadingMore, onLoadMore }: { messages: ChatEntry[]; streaming: boolean; activeResource: ResourceRef | null; onOpenPlan: (resource: ResourceRef) => void; hasMore: boolean; loadingMore: boolean; onLoadMore: () => void }) {
  const openPlanRef = useRef(onOpenPlan);
  useLayoutEffect(() => { openPlanRef.current = onOpenPlan; });
  const openPlan = useCallback((resource: ResourceRef) => openPlanRef.current(resource), []);
  const initial = useRef(new Set(messages.filter(entry => entry.kind === "message" && !streaming).map(entry => entry.kind === "message" ? entry.message.presentationId ?? entry.message.id : "")));
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const olderHeight = useRef<number | null>(null);
  const [away, setAway] = useState(false);
  useLayoutEffect(() => {
    const el = scroll.current; if (!el) return;
    if (olderHeight.current !== null && !loadingMore) { el.scrollTop += el.scrollHeight - olderHeight.current; olderHeight.current = null; }
    else if (follow.current && el.scrollHeight - el.clientHeight - el.scrollTop > 1) el.scrollTop = el.scrollHeight;
  }, [messages, loadingMore]);
  useLayoutEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const resize = new ResizeObserver(() => { if (follow.current && el.scrollHeight - el.clientHeight - el.scrollTop > 1) el.scrollTop = el.scrollHeight; });
    resize.observe(el);
    return () => resize.disconnect();
  }, []);
  const lastMessageIndex = messages.findLastIndex(entry => entry.kind === "message");
  return <div className={`relative min-h-0 flex-1 ${styles.threadReveal}`}><div ref={scroll} className="h-full overflow-y-auto overscroll-contain" onScroll={() => { const el = scroll.current!; follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; setAway(!follow.current); }}>
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6">{hasMore && <div className="text-center"><Button variant="ghost" size="sm" disabled={loadingMore} onClick={() => { olderHeight.current = scroll.current?.scrollHeight ?? null; onLoadMore(); }}>{loadingMore ? "Loading…" : "Load older messages"}</Button></div>}
      {messages.map((entry, i) => entry.kind === "summary" ? null : <div key={entry.message.presentationId ?? entry.message.id} className={entry.message.presentationId && !initial.current.has(entry.message.presentationId) ? styles.messageReveal : undefined}><AgentMessageView message={entry.message} streaming={streaming && i === lastMessageIndex} activeResource={activeResource} onOpenPlan={openPlan} /></div>)}
    </div>
  </div>{away && <Button variant="outline" size="icon-sm" className={`${styles.softReveal} absolute bottom-4 left-1/2 rounded-full bg-background shadow-md transition-shadow hover:shadow-lg`} aria-label="Jump to latest message" onClick={() => { const el = scroll.current; if (el) { el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); follow.current = true; } }}><ArrowDown className="h-4 w-4" /></Button>}</div>;
}
