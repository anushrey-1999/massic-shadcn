"use client";
import { useRef } from "react";
import { ArrowLeft, ClipboardList, Gauge, MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { cn } from "@/lib/utils";
import { AgentConversationMenu } from "./agent-conversation-menu";
import type { AgentConversation } from "./types";
export function AgentHistorySidebar({ conversations, activeId, activeView, collapsed, onCollapse, onBack, onSelect, onRename, onNewChat, onPlans, onSearch, onChats, loading, error, onRetry, hasMore, loadingMore, onMore, creditRemainingPercent, creditsLoading, creditsError, onRefreshCredits }: { conversations: AgentConversation[]; activeId: string; activeView: "chat" | "chats" | "plans"; collapsed: boolean; onCollapse: () => void; onBack: () => void; onSelect: (id: string) => void; onRename: (conversation: AgentConversation) => void; onNewChat: () => void; onPlans: () => void; onSearch: () => void; onChats: () => void; loading: boolean; error?: string; onRetry: () => void; hasMore: boolean; loadingMore: boolean; onMore: () => void; creditRemainingPercent: number | null; creditsLoading: boolean; creditsError: boolean; onRefreshCredits: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useInfiniteScroll({ enabled: hasMore && !error, loading: loading || loadingMore, onLoadMore: onMore, rootRef: scrollRef });
  return <aside className="flex h-full w-full flex-col overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground">
    <div className={cn("flex items-center pt-3 pb-2", collapsed ? "flex-col gap-1 px-0" : "justify-between px-2")}>
      <Button variant="ghost" size="icon-sm" aria-label="Back" title="Back" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" className="size-6" aria-label="Search chats" title="Search" onClick={onSearch}><Search className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon-sm" className="size-6" aria-label={collapsed ? "Expand history" : "Collapse history"} onClick={onCollapse}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button>
      </div>
    </div>
    <nav className="space-y-1 px-2 pb-3">
      {[
        { label: "New chat", Icon: Plus, click: onNewChat, active: false },
        { label: "Plans", Icon: ClipboardList, click: onPlans, active: activeView === "plans" },
        { label: "Chats", Icon: MessageSquare, click: onChats, active: activeView === "chats" },
      ].map(({ label, Icon, click, active }) => <button key={label} aria-label={label} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined} onClick={click} className={cn("flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-[background-color,box-shadow,color] hover:bg-general-primary/10 hover:text-general-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring", active && "bg-general-primary/10 text-general-primary shadow-sm")}><Icon className="h-4 w-4 shrink-0" />{!collapsed && label}</button>)}
    </nav>
    {!collapsed && <><p className="border-t border-border px-4 pt-3 pb-1 text-xs text-muted-foreground">Recents</p><div ref={scrollRef} aria-busy={loading || loadingMore} className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
      {loading && <ConversationSkeleton count={6} label="Loading conversations" />}{error && <div className="p-3 text-xs" role="alert">{error}<Button variant="ghost" size="sm" onClick={onRetry}>Retry</Button></div>}
      {!loading && !error && !conversations.length && <p className="p-3 text-xs text-muted-foreground">No conversations yet</p>}
      {conversations.map(c => <div key={c.id} className={cn("group my-0.5 flex items-center rounded-md transition-[background-color,box-shadow,color] hover:bg-general-primary/10 hover:text-general-primary hover:shadow-sm focus-within:bg-general-primary/10", activeId === c.id && "bg-general-primary/10 text-general-primary shadow-sm ring-1 ring-inset ring-general-primary/20")}><button onClick={() => onSelect(c.id)} aria-current={activeId === c.id ? "page" : undefined} className="min-w-0 flex-1 cursor-pointer rounded-md px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"><span className={cn("block truncate text-[13px]", activeId === c.id && "font-medium")}>{c.title}</span></button><AgentConversationMenu conversation={c} onRename={onRename} className="mr-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 data-[state=open]:opacity-100" /></div>)}
      {loadingMore && <ConversationSkeleton count={3} label="Loading more conversations" />}
      {hasMore && !error && <div ref={sentinelRef} className="h-px" aria-hidden="true" />}
    </div></>}
    <div className={cn("mt-auto border-t border-border p-2", collapsed && "flex justify-center px-0")}>
      {collapsed ? (
        <Button variant="ghost" size="icon-sm" aria-label="Agent credit usage remaining" title={creditRemainingPercent !== null ? `${creditRemainingPercent}% remaining` : "Agent credit usage remaining"} onClick={onRefreshCredits} disabled={creditsLoading}>
          <Gauge className="h-4 w-4" />
        </Button>
      ) : (
        <div className="relative flex h-9 items-center gap-2 overflow-hidden rounded-lg border border-general-primary/20 bg-general-primary/[0.06] px-2 shadow-xs">
          <div aria-hidden="true" className="absolute -right-3 size-10 rounded-full bg-general-primary/15 blur-lg" />
          <Gauge className="relative h-4 w-4 shrink-0 text-general-primary" />
          <div className="relative min-w-0 flex-1 text-xs font-medium text-general-primary" role="status">
            {creditsLoading && creditRemainingPercent === null
              ? <Skeleton className="h-3 w-20" />
              : creditsError || creditRemainingPercent === null
                ? "Usage unavailable"
                : `${creditRemainingPercent}% remaining`}
          </div>
          <Button variant="ghost" size="icon-sm" className="relative size-6 shrink-0 text-general-primary hover:bg-general-primary/10 hover:text-general-primary" aria-label="Refresh Agent usage" title="Refresh usage" onClick={onRefreshCredits} disabled={creditsLoading}>
            <RefreshCw className={cn("h-3.5 w-3.5", creditsLoading && "animate-spin")} />
          </Button>
        </div>
      )}
    </div>
  </aside>;
}

function ConversationSkeleton({ count, label }: { count: number; label: string }) {
  return <div className="space-y-2 px-2 py-2" role="status" aria-label={label}>
    {Array.from({ length: count }, (_, index) => <div key={index} className="flex h-8 items-center gap-2"><Skeleton className="h-3 flex-1" /><Skeleton className="size-5 shrink-0" /></div>)}
  </div>;
}
