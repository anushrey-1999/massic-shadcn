import { cn } from "@/lib/utils";
import { AGENT_CHAT_MODES, chatModeForTag } from "./agent-modes";

export function agentModeLabel(tag: string): string | null {
  const mode = chatModeForTag(tag);
  return mode ? AGENT_CHAT_MODES[mode].label : null;
}

export function AgentModeTag({ tag, className }: { tag: string; className?: string }) {
  const label = agentModeLabel(tag);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[4px] bg-background px-1.5 py-px text-[10px] leading-4 font-normal text-muted-foreground shadow-xs ring-1 ring-inset ring-border/70",
        className,
      )}
    >
      {label}
    </span>
  );
}
