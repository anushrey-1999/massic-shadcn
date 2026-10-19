"use client";

import { useRef } from "react";
import { Ellipsis, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AgentConversation } from "./types";

export function AgentConversationMenu({ conversation, onRename, className }: { conversation: AgentConversation; onRename: (conversation: AgentConversation) => void; className?: string }) {
  // Returning focus after a pointer-opened menu leaves the trigger looking focused; keyboard users keep focus return.
  const openedWithPointer = useRef(false);
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className={cn("size-7 shrink-0 rounded-md", className)} onPointerDown={() => { openedWithPointer.current = true; }} onKeyDown={() => { openedWithPointer.current = false; }} onClick={event => event.stopPropagation()} aria-label={`Chat options for ${conversation.title}`}><Ellipsis className="size-4" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={4} className="min-w-36" onCloseAutoFocus={event => { if (openedWithPointer.current) event.preventDefault(); }}><DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onRename(conversation)}><Pencil className="size-3.5" />Rename</DropdownMenuItem></DropdownMenuContent>
  </DropdownMenu>;
}
