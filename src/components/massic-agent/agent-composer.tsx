"use client";

import * as React from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

const MIN_TEXTAREA_HEIGHT = 84;

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

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, MIN_TEXTAREA_HEIGHT), 220)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  return (
    <div className="w-full">
      <div
        className={cn(
          "relative flex w-full flex-col rounded-2xl border border-border bg-card shadow-sm shadow-black/6 transition-shadow",
          "focus-within:border-general-primary/40 focus-within:shadow-md focus-within:shadow-black/10"
        )}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={1}
          className="min-h-[84px] max-h-[220px] resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
        />

        <div className="flex min-h-8 items-center justify-between gap-2 px-2 pb-2">
          {/*
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
          */}
          <div />

          <div className="flex items-center gap-1">
            {/*
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
            */}

            {/*
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
            */}

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
              <>
                {/*
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
                */}
                <div className="h-8 w-8" aria-hidden="true" />
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
