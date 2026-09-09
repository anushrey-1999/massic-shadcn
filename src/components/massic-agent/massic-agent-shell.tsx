"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MassicLoader } from "@/components/ui/massic-loader";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { AgentHistorySidebar } from "./agent-history-sidebar";
import { AgentSearchDialog } from "./agent-search-dialog";
import { AgentChatsListView } from "./agent-chats-list-view";
import { AgentChatThread } from "./agent-chat-thread";
import { AgentComposer } from "./agent-composer";
import { AgentPlanWidget } from "./agent-plan-widget";
import { AgentPlanPicker } from "./agent-plan-picker";
import { agentKeys, errorMessage, getPlan, renameThread } from "./agent-api";
import { allPlanIds, SURFACES } from "./agent-model";
import { useAgentChat } from "./use-agent-chat";
import type { AgentConversation, ResourceRef } from "./types";
import styles from "./agent.module.css";

export function MassicAgentShell({ businessId }: { businessId: string }) {
  return <AgentWorkspace key={businessId} businessId={businessId} />;
}
function AgentWorkspace({ businessId }: { businessId: string }) {
  const chat = useAgentChat(businessId);
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileHistory, setMobileHistory] = useState(false);
  const [search, setSearch] = useState(false);
  const [view, setView] = useState<"chat" | "chats">("chat");
  const [planPicker, setPlanPicker] = useState(false);
  const [planVisible, setPlanVisible] = useState(true);
  const [width, setWidth] = useState(940);
  const [renameTarget, setRenameTarget] = useState<AgentConversation | null>(null);
  const [title, setTitle] = useState("");
  const splitRef = useRef<HTMLDivElement>(null);
  const cleanupResize = useRef<(() => void) | null>(null);
  const planRef = chat.draft.resource;
  const planQuery = useQuery({ queryKey: agentKeys.plan(businessId, planRef?.id ?? ""), queryFn: ({ signal }) => getPlan(businessId, planRef!.id, signal), enabled: !!planRef, retry: false });
  const expectedPlanType = planRef?.type === "webpage_plan" ? "webpages" : "social_channels";
  const plan = planQuery.data && (!planQuery.data.plan_type || planQuery.data.plan_type === expectedPlanType) ? planQuery.data : undefined;
  const planError = planQuery.isError ? errorMessage(planQuery.error) : planQuery.data && !plan ? "This plan does not match the conversation mode." : null;
  const ids = plan && planRef ? allPlanIds(plan.plan_json ?? [], planRef.type) : [];
  useEffect(() => {
    if (!plan) return;
    const filtered = chat.draft.selectedIds.filter(id => ids.includes(id));
    if (filtered.length !== chat.draft.selectedIds.length) chat.updateDraft({ selectedIds: filtered });
  }, [plan]);
  const rename = useMutation({ mutationFn: ({ id, title }: { id: string; title: string }) => renameThread(businessId, id, title), onSuccess: (result) => { chat.updateTitle(result.thread_id, result.title ?? title.trim()); setRenameTarget(null); void qc.invalidateQueries({ queryKey: agentKeys.threads(businessId) }); } });
  useEffect(() => { const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(v => !v); } }; window.addEventListener("keydown", key); return () => { window.removeEventListener("keydown", key); cleanupResize.current?.(); }; }, []);
  useEffect(() => { setPlanVisible(true); }, [chat.activeKey, planRef?.id]);
  const select = (id: string) => { chat.selectChat(id); setView("chat"); setMobileHistory(false); };
  const newChat = () => { chat.newChat(); setView("chat"); setMobileHistory(false); };
  const openPlan = (r: ResourceRef) => { chat.openPlan(r); setView("chat"); setPlanVisible(true); };
  const openRename = (conversation: AgentConversation) => { setRenameTarget(conversation); setTitle(conversation.title); rename.reset(); };
  const streaming = chat.runningKey === chat.activeKey;
  const busyElsewhere = !!chat.runningKey && !streaming;
  const loadingMessages = !!chat.conversation && chat.history.messages.isLoading && !chat.messages.length;
  const showEmpty = !loadingMessages && !chat.messages.length && !chat.history.messages.isError;
  const historyProps = {
    conversations: chat.conversations, activeId: chat.activeKey, onSelect: select, onRename: openRename, onNewChat: newChat, onSearch: () => setSearch(true), onChats: () => { setView("chats"); setMobileHistory(false); },
    loading: chat.history.threads.isLoading, error: chat.history.threads.isError ? errorMessage(chat.history.threads.error) : undefined, onRetry: () => { void chat.history.threads.refetch(); },
    hasMore: chat.history.threads.hasNextPage, loadingMore: chat.history.threads.isFetchingNextPage, onMore: () => { void chat.history.threads.fetchNextPage(); }, userName: user?.username || user?.email || "You",
  };
  const composer = <AgentComposer value={chat.draft.input} onChange={input => chat.updateDraft({ input })} surface={chat.surface} locked={!!chat.conversation}
    onSurface={surface => { if (chat.conversation) chat.newChat(surface); else chat.updateDraft({ surface, resource: null, selectedIds: [] }); setView("chat"); }}
    onClearMode={() => { if (chat.conversation) chat.newChat(); else chat.updateDraft({ surface: "global", resource: null, selectedIds: [] }); }}
    resource={planRef} selectedCount={chat.draft.selectedIds.length} totalCount={ids.length} planValid={plan?.valid} planLoaded={!!plan}
    onOpenPlans={() => setPlanPicker(true)} onShowPlan={() => setPlanVisible(true)} onSend={(intent, override) => { void chat.send(intent, override); }} onStop={() => { void chat.stop(); }}
    streaming={streaming} stopping={chat.stopping} disabled={busyElsewhere || !chat.knownThread || loadingMessages || chat.history.messages.isError} focusKey={chat.activeKey} />;
  const resize = (value: number) => setWidth(Math.max(560, Math.min(value, 1050, (splitRef.current?.clientWidth ?? 1510) - 460)));
  return <div className={cn(styles.workspace, "flex h-dvh w-full overflow-hidden bg-background")}>
    <div className={cn("hidden shrink-0 overflow-hidden transition-[width] duration-200 motion-reduce:transition-none md:block", collapsed ? "w-12" : "w-[240px]")}><AgentHistorySidebar {...historyProps} collapsed={collapsed} onCollapse={() => setCollapsed(v => !v)} /></div>
    <Sheet open={mobileHistory} onOpenChange={setMobileHistory}><SheetContent side="left" showClose={false} className="w-[280px] gap-0 p-0"><SheetTitle className="sr-only">Chat history</SheetTitle><SheetDescription className="sr-only">Choose or start a conversation</SheetDescription><AgentHistorySidebar {...historyProps} collapsed={false} onCollapse={() => setMobileHistory(false)} /></SheetContent></Sheet>
    <AgentSearchDialog open={search} onOpenChange={setSearch} conversations={chat.conversations} onSelect={select} />
    <Dialog open={!!renameTarget} onOpenChange={open => { if (!open) setRenameTarget(null); }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Rename chat</DialogTitle><DialogDescription>Use a short title that will be easy to find later.</DialogDescription></DialogHeader><form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); if (renameTarget && title.trim() && !rename.isPending) rename.mutate({ id: renameTarget.id, title }); }}><Input aria-label="Conversation title" autoFocus value={title} maxLength={200} onChange={e => setTitle(e.target.value)} /><Button type="submit" disabled={rename.isPending || !title.trim()}>{rename.isPending ? "Saving…" : "Save"}</Button></form>{rename.isError && <p role="alert" className="text-sm text-destructive">{errorMessage(rename.error)}</p>}</DialogContent></Dialog>
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-3 md:hidden" aria-label="Agent workspace toolbar">
        <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open history" onClick={() => setMobileHistory(true)}><Menu className="h-4 w-4" /></Button>
      </header>
      <div ref={splitRef} className="relative flex min-h-0 w-full flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {view === "chats" ? <AgentChatsListView conversations={chat.conversations} onSelect={select} onNewChat={newChat} onRename={openRename} /> : <>
            {loadingMessages ? <div className="flex flex-1 items-center justify-center"><MassicLoader /></div>
              : chat.history.messages.isError ? <div className="flex-1 p-6" role="alert"><p>{errorMessage(chat.history.messages.error)}</p><Button variant="outline" className="mt-3" onClick={() => chat.history.messages.refetch()}>Reload conversation</Button></div>
              : showEmpty ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-8 sm:px-6"><div className="mb-6 flex items-center gap-2.5"><MassicLoader size={28} animate={false} /><h1 className="text-2xl font-medium tracking-tight">Ask Me Anything</h1></div><div className="w-full max-w-2xl">{composer}</div></div>
              : <AgentChatThread key={chat.activeKey} messages={chat.messages} streaming={streaming} onOpenPlan={openPlan} hasMore={chat.history.messages.hasNextPage} loadingMore={chat.history.messages.isFetchingNextPage} onLoadMore={() => { void chat.history.messages.fetchNextPage(); }} />}
            {!showEmpty && <div className="shrink-0 px-4 pb-4"><div className="mx-auto w-full max-w-3xl">{composer}</div></div>}
            <div className="mx-auto w-full max-w-3xl px-4 pb-3">
              {chat.error && <div role="alert" className="flex items-start gap-2 rounded-md bg-destructive/5 p-3 text-sm text-destructive"><p className="flex-1">{chat.error}</p><button aria-label="Dismiss error" onClick={() => chat.setError(null)}><X className="h-4 w-4" /></button></div>}
              {busyElsewhere && <p role="status" className="text-xs text-muted-foreground">A response is running in another chat. <button className="cursor-pointer underline" onClick={() => select(chat.runningKey!)}>Open that chat</button> to view or stop it.</p>}
              {!chat.knownThread && !chat.history.threads.isLoading && !chat.history.threads.isFetchingNextPage && <p role="alert" className="text-sm text-destructive">This conversation could not be found for this business. <button onClick={newChat} className="underline">Start a new chat</button>.</p>}
              {chat.creditWarning && <p className="text-xs text-muted-foreground">Agent credits are running low.</p>}
              {chat.history.citations.isError && <p className="text-xs text-muted-foreground">Sources could not be loaded. <button onClick={() => chat.history.citations.refetch()} className="underline">Retry sources</button></p>}
            </div>
          </>}
        </div>
        {view === "chat" && planRef && planVisible && <aside className={cn(styles.planPanel, "flex min-h-0 flex-col border-l border-border bg-background")} style={{ "--plan-width": `${width}px` } as React.CSSProperties}>
          <div role="separator" tabIndex={0} aria-label="Resize plan panel" aria-orientation="vertical" aria-valuenow={width} aria-valuemin={560} aria-valuemax={1050}
            className="absolute -left-1 top-0 hidden h-full w-2 cursor-col-resize touch-none hover:bg-general-primary/20 focus-visible:bg-general-primary/20 xl:block"
            onKeyDown={e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); resize(width + (e.key === "ArrowLeft" ? 20 : -20)); } }}
            onPointerDown={e => { e.preventDefault(); const start = e.clientX; const startWidth = width; const move = (event: PointerEvent) => resize(startWidth + start - event.clientX); const end = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); cleanupResize.current = null; }; cleanupResize.current?.(); cleanupResize.current = end; window.addEventListener("pointermove", move); window.addEventListener("pointerup", end, { once: true }); }} />
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4"><div><p className="text-xs text-muted-foreground">{SURFACES[chat.surface].label} plan</p><h2 className="text-sm font-medium">Plan #{planRef.id}</h2></div><div className="flex gap-1"><Button variant="ghost" size="sm" className="xl:hidden" onClick={() => setPlanVisible(false)}>Back to chat</Button><Button variant="ghost" size="icon-sm" aria-label="Close plan and clear selection" onClick={() => chat.updateDraft({ resource: null, selectedIds: [] })}><X className="h-4 w-4" /></Button></div></div>
          <div className="flex min-h-0 flex-1 flex-col p-4">{planQuery.isLoading ? <div role="status" className="flex items-center gap-2 text-sm"><MassicLoader size={20} />Loading plan…</div> : planError ? <div role="alert"><p>{planError}</p><Button variant="outline" onClick={() => planQuery.refetch()}>Retry</Button></div> : plan ? <AgentPlanWidget plan={plan} type={planRef.type} selectedIds={chat.draft.selectedIds} onSelection={selectedIds => chat.updateDraft({ selectedIds })} /> : null}</div>
          <div className="border-t border-border p-3 xl:hidden"><Button variant="outline" className="w-full" onClick={() => setPlanVisible(false)}>Chat about {chat.draft.selectedIds.length ? `${chat.draft.selectedIds.length} selected items` : "this plan"}</Button></div>
        </aside>}
      </div>
    </main>
    {chat.surface !== "global" && <AgentPlanPicker businessId={businessId} type={SURFACES[chat.surface].resource!} open={planPicker} onOpenChange={setPlanPicker} onPick={openPlan} />}
  </div>;
}
