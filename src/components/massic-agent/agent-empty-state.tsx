"use client";

import { ArrowUpRight } from "lucide-react";
import { MassicLoader } from "@/components/ui/massic-loader";

const suggestions = [
  "Draft a launch email for our new feature",
  "Audit my landing page for conversion issues",
  "Summarize this week's analytics",
  "Brainstorm content ideas for next month",
];

type Props = {
  onPick: (text: string) => void;
};

export function AgentEmptyState({ onPick }: Props) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6">
      <div className="mb-5">
        <MassicLoader size={44} animate={false} />
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        How can I help you today?
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Ask Massic Agent anything about your business.
      </p>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-accent"
          >
            <span className="leading-snug">{s}</span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
