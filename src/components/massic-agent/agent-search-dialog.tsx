"use client";

import * as React from "react";
import { CornerDownLeft, MessageCircle } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { AgentConversation } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: AgentConversation[];
  onSelect: (id: string) => void;
};

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < hour) return "Past hour";
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < week) return "Past week";
  if (diff < month) return "Past month";
  if (diff < year) return "Past year";
  return "Older";
}

export function AgentSearchDialog({
  open,
  onOpenChange,
  conversations,
  onSelect,
}: Props) {
  const sorted = React.useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations]
  );

  const handlePick = (id: string) => {
    onSelect(id);
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search your chats"
      className="top-[15vh] max-w-2xl translate-y-0"
    >
      <CommandInput placeholder="Search chats and projects" />
      <CommandList className="max-h-[480px]">
        <CommandEmpty>No chats found.</CommandEmpty>
        <CommandGroup>
          {sorted.map((c) => (
            <CommandItem
              key={c.id}
              value={`${c.title} ${c.id}`}
              onSelect={() => handlePick(c.id)}
              className="group flex cursor-pointer items-center gap-3 px-3 py-2.5 data-[selected=true]:bg-muted"
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm text-foreground">
                {c.title}
              </span>
              <span className="text-xs text-muted-foreground group-data-[selected=true]:hidden">
                {formatRelative(c.updatedAt)}
              </span>
              <CornerDownLeft className="hidden h-4 w-4 text-muted-foreground group-data-[selected=true]:inline-block" />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
