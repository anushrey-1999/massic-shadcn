"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AgentConversationMenu } from "./agent-conversation-menu";
import type { AgentConversation } from "./types";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

type Props = {
  conversations: AgentConversation[];
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (conversation: AgentConversation) => void;
};

export function AgentChatsListView({ conversations, onSelect, onNewChat, onRename }: Props) {
  const [query, setQuery] = React.useState("");

  const sorted = React.useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations]
  );

  const filtered = React.useMemo(
    () =>
      query.trim()
        ? sorted.filter((c) =>
            c.title.toLowerCase().includes(query.toLowerCase())
          )
        : sorted,
    [sorted, query]
  );

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="flex items-center justify-between pt-10 pb-6">
          <h1 className="text-3xl font-semibold text-foreground">Chats</h1>
          <Button type="button" size="sm" onClick={onNewChat}>
            New chat
          </Button>
        </div>

        <div className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats..."
              className="pl-9 bg-background shadow-none"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No chats found.
          </p>
        ) : (
          <div>
            {filtered.map((c, i) => (
              <div key={c.id}>
                <div className={cn("group flex items-center rounded-lg transition-[background-color,box-shadow] hover:bg-general-primary/8 hover:shadow-sm focus-within:bg-general-primary/8")}>
                  <button type="button" onClick={() => onSelect(c.id)} className="flex min-w-0 flex-1 cursor-pointer items-baseline justify-between gap-4 rounded-lg px-2 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30">
                    <span className="truncate text-sm font-normal text-foreground">{c.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(c.updatedAt)}</span>
                  </button>
                  <AgentConversationMenu conversation={c} onRename={onRename} className="mr-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 data-[state=open]:opacity-100" />
                </div>
                {i < filtered.length - 1 && (
                  <div className="border-b border-border/30" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
