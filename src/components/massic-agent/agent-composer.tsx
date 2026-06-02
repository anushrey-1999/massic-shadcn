"use client";

import * as React from "react";
import { ArrowUp, AudioLines, ChevronDown, Mic, Plus, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
};

const models = ["Massic v1", "Massic v1 Pro", "Massic Lite"];

export function AgentComposer({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
  placeholder = "Write a message…",
}: Props) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [model, setModel] = React.useState(models[0]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [value]);

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  return (
    <div className="w-full">
      <div
        className={cn(
          "relative flex w-full flex-col rounded-2xl border border-border bg-card shadow-sm shadow-black/[0.06] transition-shadow",
          "focus-within:border-general-primary/40 focus-within:shadow-md focus-within:shadow-black/[0.1]"
        )}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={1}
          className="min-h-[52px] max-h-[220px] resize-none border-0 bg-transparent px-4 pt-3.5 pb-1 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
        />

        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled
            aria-label="Attach"
            className="h-8 w-8 text-muted-foreground"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {model}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {models.map((m) => (
                  <DropdownMenuItem key={m} onClick={() => setModel(m)}>
                    {m}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Voice input"
              className="h-8 w-8 text-muted-foreground"
              disabled
            >
              <Mic className="h-4 w-4" />
            </Button>

            {isStreaming ? (
              <Button
                type="button"
                size="icon-sm"
                onClick={onStop}
                aria-label="Stop"
                className="h-8 w-8"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : canSend ? (
              <Button
                type="button"
                size="icon-sm"
                onClick={onSend}
                aria-label="Send"
                className="h-8 w-8"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Audio"
                className="h-8 w-8 text-muted-foreground"
                disabled
              >
                <AudioLines className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
