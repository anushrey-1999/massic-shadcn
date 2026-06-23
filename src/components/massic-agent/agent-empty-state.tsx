"use client";

import { MassicLoader } from "@/components/ui/massic-loader";
import { AgentComposer } from "./agent-composer";

/*
const categoryChips = [
  { id: "analytics", label: "Analytics", prompt: "Summarize this week's analytics performance" },
  { id: "strategy", label: "Strategy", prompt: "Help me build a content marketing strategy" },
  { id: "content", label: "Content", prompt: "Brainstorm content ideas for next month" },
  { id: "campaigns", label: "Campaigns", prompt: "Draft a launch email for our new feature" },
  { id: "pick", label: "Massic's pick", prompt: "What's the most important thing I should focus on to grow my business?" },
];
*/

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: (overrideText?: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  userName?: string;
};

export function AgentEmptyState({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
}: Props) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 pb-12">
      <div className="mb-6 flex items-center gap-2.5">
        <MassicLoader size={28} animate={false} />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Ask Me Anything
        </h1>
      </div>

      <div className="w-full max-w-2xl space-y-3">
        <AgentComposer
          value={value}
          onChange={onChange}
          onSend={() => onSend()}
          onStop={onStop}
          isStreaming={isStreaming}
          placeholder="How can I help you today?"
        />

        {/*
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {categoryChips.map((chip, i) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onSend(chip.prompt)}
              className="animate-fade-up cursor-pointer rounded-md border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-general-primary/8 hover:text-foreground hover:border-general-primary/20"
              style={{ animationDelay: `${0.1 + i * 0.07}s` }}
            >
              {chip.label}
            </button>
          ))}
        </div>
        */}
      </div>
    </div>
  );
}
