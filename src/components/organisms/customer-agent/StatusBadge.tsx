import type { AgentStatusKind } from "@/lib/customer-agent";
import { cn } from "@/lib/utils";

const TONES: Record<AgentStatusKind, { badge: string; dot: string }> = {
  live: { badge: "bg-green-100 text-green-800", dot: "bg-green-500" },
  not_installed: { badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  not_seen: { badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  no_credits: { badge: "bg-red-100 text-red-800", dot: "bg-red-500" },
  off: { badge: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
};

export function StatusDot({ kind, className }: { kind: AgentStatusKind; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-full", TONES[kind].dot, kind === "live" && "animate-pulse", className)}
    />
  );
}

export function StatusBadge({ kind, label }: { kind: AgentStatusKind; label: string }) {
  const tone = TONES[kind];
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-sm px-2 text-xs font-medium", tone.badge)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", tone.dot, kind === "live" && "animate-pulse")} />
      {label}
    </span>
  );
}
