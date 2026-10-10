"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { SendHorizontal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import styles from "./agent.module.css";
import { cn } from "@/lib/utils";

export type AgentComposerProps = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  stopping: boolean;
  disabled?: boolean;
  sendDisabled?: boolean;
  focusKey: string;
  centered?: boolean;
  placeholder?: string;
  label?: string;
  context?: ReactNode;
  attachments?: ReactNode;
  actions?: ReactNode;
};
export function AgentComposer(p: AgentComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measureHeight = () => {
      const minHeight = p.centered ? 52 : 44;
      const maxHeight = 180;
      // Measure an invisible clone so the live textarea never snaps through auto height.
      const measure = el.cloneNode() as HTMLTextAreaElement;
      measure.value = p.value;
      measure.removeAttribute("id");
      measure.removeAttribute("aria-label");
      measure.setAttribute("aria-hidden", "true");
      measure.tabIndex = -1;
      Object.assign(measure.style, {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        height: "0px",
        minHeight: "0px",
        width: `${el.getBoundingClientRect().width}px`,
        transition: "none",
      });
      el.parentElement!.appendChild(measure);
      const measured = measure.scrollHeight;
      measure.remove();
      const height = Math.min(Math.max(measured, minHeight), maxHeight);
      el.style.height = `${height}px`;
      el.style.overflowY = measured > maxHeight ? "auto" : "hidden";
      setExpanded(height > minHeight);
    };
    measureHeight();
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth;
        measureHeight();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [p.centered, p.value]);
  useEffect(() => {
    if (!p.disabled) ref.current?.focus();
  }, [p.focusKey, p.disabled]);
  const busy = p.disabled || p.streaming || p.sendDisabled;
  return (
    <div className="w-full">
      <div className="flex w-full flex-col rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:shadow-md focus-within:border-general-primary/40 focus-within:shadow-md">
        {p.context}
        <div className="relative">
          <Textarea
            ref={ref}
            value={p.value}
            onChange={(e) => p.onChange(e.target.value)}
            aria-label={p.label ?? "Message Massic Agent"}
            disabled={p.disabled || p.streaming}
            rows={1}
            style={{ fieldSizing: "fixed" } as CSSProperties}
            aria-keyshortcuts="Enter"
            placeholder={p.placeholder ?? "Ask Massic"}
            className={cn(
              styles.composerTextarea,
              "min-h-0 max-h-[180px] resize-none overflow-y-hidden border-0 bg-transparent pr-14 pl-4 text-sm leading-5 shadow-none focus-visible:ring-0",
              p.centered ? "py-4" : "py-3",
            )}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                if (p.value.trim() && !busy) p.onSend();
              }
            }}
          />
          <div
            className={cn(
              "absolute right-2 flex items-center transition-[top,bottom,transform] duration-150 motion-reduce:transition-none",
              expanded ? "top-[calc(100%-44px)]" : "top-[calc(50%-18px)]",
            )}
          >
            {p.streaming ? (
              <Button
                type="button"
                size="icon"
                onClick={p.onStop}
                disabled={p.stopping}
                aria-label={p.stopping ? "Stopping response" : "Stop response"}
                title={p.stopping ? "Stopping response" : "Stop response"}
                className="rounded-lg shadow-sm"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                onClick={() => p.onSend()}
                disabled={busy || !p.value.trim()}
                aria-label="Send message"
                title="Send message"
                className="rounded-lg shadow-sm"
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {p.attachments}
      </div>
      {!p.centered && (
        <p className="mt-1.5 hidden px-1 text-right text-[10px] leading-[1.5] text-general-muted-foreground sm:block">
          Enter to send · Shift + Enter for a new line
        </p>
      )}
      {p.actions}
    </div>
  );
}
