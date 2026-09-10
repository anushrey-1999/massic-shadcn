"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AgentConversationMenu } from "./agent-conversation-menu";
import type { AgentConversation } from "./types";
export function AgentHistorySidebar({ conversations, activeId, collapsed, onCollapse, onSelect, onRename, onNewChat, onSearch, onChats, loading, error, onRetry, hasMore, loadingMore, onMore, userName, backHref }: { conversations: AgentConversation[]; activeId: string; collapsed: boolean; onCollapse: () => void; onSelect: (id: string) => void; onRename: (conversation: AgentConversation) => void; onNewChat: () => void; onSearch: () => void; onChats: () => void; loading: boolean; error?: string; onRetry: () => void; hasMore: boolean; loadingMore: boolean; onMore: () => void; userName: string; backHref: string }) {
  return <aside className="flex h-full w-full flex-col overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground">
    <div className="flex items-center justify-between px-2 pt-3 pb-2">{!collapsed && <div className="flex items-center gap-2"><Image src="/massic-icon-green.svg" alt="Massic" width={22} height={22} /><span className="text-sm font-medium">Massic</span></div>}<Button variant="ghost" size="icon-sm" aria-label={collapsed ? "Expand history" : "Collapse history"} onClick={onCollapse}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button></div>
    <nav className="space-y-1 px-2 pb-3">
      <Link href={backHref} aria-label="Back" title={collapsed ? "Back" : undefined} className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-[background-color,box-shadow,color] hover:bg-general-primary/10 hover:text-general-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"><ArrowLeft className="h-4 w-4 shrink-0" />{!collapsed && "Back"}</Link>
      {[{ label: "New chat", Icon: Plus, click: onNewChat }, { label: "Chats", Icon: MessageSquare, click: onChats }, { label: "Search", Icon: Search, click: onSearch }].map(({ label, Icon, click }) => <button key={label} aria-label={label} title={collapsed ? label : undefined} onClick={click} className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-[background-color,box-shadow,color] hover:bg-general-primary/10 hover:text-general-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"><Icon className="h-4 w-4 shrink-0" />{!collapsed && label}</button>)}
    </nav>
    {!collapsed && <><p className="border-t border-border px-4 pt-3 pb-1 text-xs text-muted-foreground">Recents</p><div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
      {loading && <p className="p-3 text-xs" role="status">Loading conversations…</p>}{error && <div className="p-3 text-xs" role="alert">{error}<Button variant="ghost" size="sm" onClick={onRetry}>Retry</Button></div>}
      {!loading && !error && !conversations.length && <p className="p-3 text-xs text-muted-foreground">No conversations yet</p>}
      {conversations.map(c => <div key={c.id} className={cn("group my-0.5 flex items-center rounded-md transition-[background-color,box-shadow,color] hover:bg-general-primary/10 hover:text-general-primary hover:shadow-sm focus-within:bg-general-primary/10", activeId === c.id && "bg-general-primary/10 text-general-primary shadow-sm")}><button onClick={() => onSelect(c.id)} aria-current={activeId === c.id ? "page" : undefined} className="min-w-0 flex-1 cursor-pointer rounded-md px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"><span className="block truncate text-[13px]">{c.title}</span></button><AgentConversationMenu conversation={c} onRename={onRename} className="mr-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 data-[state=open]:opacity-100" /></div>)}
      {hasMore && <Button variant="ghost" size="sm" disabled={loadingMore} onClick={onMore}>{loadingMore ? "Loading…" : "Load more chats"}</Button>}
    </div><div className="truncate border-t border-border px-4 py-3 text-sm text-muted-foreground">{userName}</div></>}
  </aside>;
}
