"use client";

import * as React from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  PanelLeftClose,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AgentConversation } from "./types";

type Props = {
  conversations: AgentConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onSearch?: () => void;
  onCollapse?: () => void;
};

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  rightSlot?: React.ReactNode;
  onClick?: () => void;
};

export function AgentHistorySidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onSearch,
  onCollapse,
}: Props) {
  const navItems: NavItem[] = [
    { id: "new", label: "New chat", icon: Plus, onClick: onNewChat },
    { id: "search", label: "Search", icon: Search, onClick: onSearch },
  ];

  const sortedRecents = React.useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations]
  );

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Image src="/massic-icon-green.svg" alt="Massic" width={22} height={22} />
          <span className="text-sm font-semibold">Massic</span>
        </div>
        {onCollapse ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onCollapse}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <nav className="flex flex-col gap-0.5 px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/70"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.rightSlot}
            </button>
          );
        })}
      </nav>

      <div className="px-4 pt-4 pb-2 text-xs font-medium text-muted-foreground">
        Recents
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 pb-4">
          {sortedRecents.length === 0 ? (
            <div className="px-3 py-6 text-xs text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            sortedRecents.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group relative flex items-center rounded-md transition-colors",
                  activeId === c.id
                    ? "bg-sidebar-accent"
                    : "hover:bg-sidebar-accent/60"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className="flex-1 cursor-pointer truncate px-2 py-2 text-left text-[13px] text-foreground/90"
                >
                  {c.title}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Chat options"
                      className="mr-0.5 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onDelete(c.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border px-2 py-2">
        <div className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-sidebar-accent/60">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-general-primary/15 text-xs font-semibold text-general-primary">
            M
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium leading-tight">You</div>
            <div className="truncate text-xs text-muted-foreground leading-tight">
              Free plan
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
