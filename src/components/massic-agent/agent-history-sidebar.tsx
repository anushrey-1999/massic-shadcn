"use client";

import * as React from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  MoreVertical,
  Trash2,
  MessageSquare,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AgentConversation, SpecialistState } from "./types";

type Props = {
  conversations: AgentConversation[];
  activeId: string | null;
  activeView?: "chat" | "chats";
  isCollapsed?: boolean;
  specialistState?: SpecialistState;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onSearch?: () => void;
  onCollapse?: () => void;
  onExpand?: () => void;
  onChatsView?: () => void;
};

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
};

export function AgentHistorySidebar({
  conversations,
  activeId,
  activeView = "chat",
  isCollapsed = false,
  specialistState,
  onSelect,
  onNewChat,
  onDelete,
  onSearch,
  onCollapse,
  onExpand,
  onChatsView,
}: Props) {
  const primaryNavItems: NavItem[] = [
    { id: "new", label: "New chat", icon: Plus, onClick: onNewChat },
    { id: "chats", label: "Chats", icon: MessageSquare, onClick: onChatsView },
    { id: "artifacts", label: "Artifacts", icon: Layers },
  ];

  const sortedRecents = React.useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations]
  );

  const labelClass = cn(
    "overflow-hidden whitespace-nowrap transition-all ease-in-out",
    isCollapsed
      ? "max-w-0 opacity-0 duration-150"
      : "max-w-[180px] opacity-100 duration-200 delay-[220ms]"
  );

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-sidebar text-sidebar-foreground overflow-hidden">

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-2 pt-3 pb-2">
        <div className="flex min-w-0 items-center">
          {/* Icon slot: cross-fades between expand button and logo */}
          <div className="relative h-8 w-8 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onExpand}
              aria-label="Expand sidebar"
              className={cn(
                "absolute inset-0 h-8 w-8 text-muted-foreground transition-all duration-150 ease-in-out",
                isCollapsed ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              )}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
            <div className={cn(
              "absolute inset-0 flex items-center justify-center transition-all ease-in-out",
              isCollapsed ? "opacity-0 pointer-events-none duration-150" : "opacity-100 duration-200 delay-[220ms]"
            )}>
              <Image src="/massic-icon-green.svg" alt="Massic" width={22} height={22} />
            </div>
          </div>

          <span className={cn(labelClass, "ml-2 text-sm font-semibold")}>
            Massic
          </span>
        </div>

        <div className={cn(
          "flex shrink-0 items-center gap-0.5 overflow-hidden transition-all ease-in-out",
          isCollapsed ? "max-w-0 opacity-0 duration-150" : "max-w-[80px] opacity-100 duration-200 delay-[220ms]"
        )}>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onSearch} aria-label="Search">
            <Search className="h-4 w-4 text-muted-foreground" />
          </Button>
          {onCollapse ? (
            <Button type="button" variant="ghost" size="icon-sm" onClick={onCollapse} aria-label="Collapse sidebar">
              <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
            </Button>
          ) : null}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2 py-2">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === "chats" && activeView === "chats";
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={cn(
                "flex h-8 w-full cursor-pointer items-center rounded-md px-2 text-sm text-sidebar-foreground transition-colors hover:bg-general-primary/8",
                isActive && "bg-general-primary/8"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className={cn(labelClass, "ml-2.5")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border" />

      {/* Recents label */}
      <div className={cn(
        "overflow-hidden transition-all ease-in-out",
        isCollapsed ? "max-h-0 opacity-0 duration-150" : "max-h-8 opacity-100 duration-200 delay-[220ms]"
      )}>
        <div className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">Recents</div>
      </div>

      {/* Conversation list */}
      <div className={cn(
        "flex-1 min-h-0 overflow-y-auto overflow-x-hidden transition-opacity ease-in-out",
        isCollapsed ? "opacity-0 pointer-events-none duration-150" : "opacity-100 duration-200 delay-[220ms]"
      )}>
        <div className="px-2 pb-4">
          {sortedRecents.length === 0 ? (
            <div className="px-3 py-6 text-xs text-muted-foreground">No conversations yet</div>
          ) : (
            sortedRecents.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group relative flex min-w-0 items-center rounded-md px-2 transition-colors my-0.5",
                  activeId === c.id ? "bg-general-primary/8" : "hover:bg-general-primary/8"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className="min-w-0 flex-1 cursor-pointer overflow-hidden py-2 text-left text-[13px] text-foreground/90"
                >
                  <span className="block truncate">{c.title}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Chat options"
                      className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onDelete(c.id)}
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/8"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-2 py-2">
        <div className="flex items-center rounded-md px-1.5 py-1.5 hover:bg-sidebar-accent/60">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-general-primary/15 text-xs font-semibold text-general-primary">
            M
          </div>
          <div className={cn(
            "min-w-0 overflow-hidden transition-all ease-in-out",
            isCollapsed ? "max-w-0 opacity-0 duration-150" : "max-w-[200px] opacity-100 duration-200 delay-[220ms] ml-2"
          )}>
            <div className="truncate text-sm font-medium leading-tight">You</div>
            <div className="truncate text-xs text-muted-foreground leading-tight">Free plan</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
