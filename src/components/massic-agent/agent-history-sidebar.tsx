"use client";
import { useRef } from "react";
import { ArrowLeft, ClipboardList, MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { cn } from "@/lib/utils";
import { AgentConversationMenu } from "./agent-conversation-menu";
import type { AgentConversation } from "./types";
export function AgentHistorySidebar({ conversations, activeId, activeView, collapsed, onCollapse, onBack, onSelect, onRename, onNewChat, onPlans, onSearch, onChats, loading, error, onRetry, hasMore, loadingMore, onMore }: { conversations: AgentConversation[]; activeId: string; activeView: "chat" | "chats" | "plans"; collapsed: boolean; onCollapse: () => void; onBack: () => void; onSelect: (id: string) => void; onRename: (conversation: AgentConversation) => void; onNewChat: () => void; onPlans: () => void; onSearch: () => void; onChats: () => void; loading: boolean; error?: string; onRetry: () => void; hasMore: boolean; loadingMore: boolean; onMore: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useInfiniteScroll({ enabled: hasMore && !error, loading: loading || loadingMore, onLoadMore: onMore, rootRef: scrollRef });
  return <aside className="flex h-full w-full flex-col overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground">
    <div className={cn("flex items-center px-2 pt-3 pb-2", collapsed ? "flex-col gap-1" : "justify-between")}>
      <Button variant="ghost" size="icon-sm" aria-label="Back" title="Back" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon-sm" aria-label={collapsed ? "Expand history" : "Collapse history"} onClick={onCollapse}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button>
    </div>
    <nav className="space-y-1 px-2 pb-3">
      {[
        { label: "New chat", Icon: Plus, click: onNewChat, active: false },
        { label: "Plans", Icon: ClipboardList, click: onPlans, active: activeView === "plans" },
        { label: "Chats", Icon: MessageSquare, click: onChats, active: activeView === "chats" },
        { label: "Search", Icon: Search, click: onSearch, active: false },
      ].map(({ label, Icon, click, active }) => <button key={label} aria-label={label} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined} onClick={click} className={cn("flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-[background-color,box-shadow,color] hover:bg-general-primary/10 hover:text-general-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring", active && "bg-general-primary/10 text-general-primary shadow-sm")}><Icon className="h-4 w-4 shrink-0" />{!collapsed && label}</button>)}
    </nav>
    {!collapsed && <><p className="border-t border-border px-4 pt-3 pb-1 text-xs text-muted-foreground">Recents</p><div ref={scrollRef} aria-busy={loading || loadingMore} className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
      {loading && <ConversationSkeleton count={6} label="Loading conversations" />}{error && <div className="p-3 text-xs" role="alert">{error}<Button variant="ghost" size="sm" onClick={onRetry}>Retry</Button></div>}
      {!loading && !error && !conversations.length && <p className="p-3 text-xs text-muted-foreground">No conversations yet</p>}
      {conversations.map(c => <div key={c.id} className={cn("group my-0.5 flex items-center rounded-md transition-[background-color,box-shadow,color] hover:bg-general-primary/10 hover:text-general-primary hover:shadow-sm focus-within:bg-general-primary/10", activeId === c.id && "bg-general-primary/10 text-general-primary shadow-sm")}><button onClick={() => onSelect(c.id)} aria-current={activeId === c.id ? "page" : undefined} className="min-w-0 flex-1 cursor-pointer rounded-md px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"><span className="block truncate text-[13px]">{c.title}</span></button><AgentConversationMenu conversation={c} onRename={onRename} className="mr-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 data-[state=open]:opacity-100" /></div>)}
      {loadingMore && <ConversationSkeleton count={3} label="Loading more conversations" />}
      {hasMore && !error && <div ref={sentinelRef} className="h-px" aria-hidden="true" />}
    </div></>}
  </aside>;
}

function ConversationSkeleton({ count, label }: { count: number; label: string }) {
  return <div className="space-y-2 px-2 py-2" role="status" aria-label={label}>
    {Array.from({ length: count }, (_, index) => <div key={index} className="flex h-8 items-center gap-2"><Skeleton className="h-3 flex-1" /><Skeleton className="size-5 shrink-0" /></div>)}
  </div>;
}
