"use client";

import * as React from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { MassicLoader } from "@/components/ui/massic-loader";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  isActive: boolean;
  defaultOpen?: boolean;
};

const URL_RE = /https?:\/\/[^\s)>]+/g;

function hasUrl(text: string) {
  return URL_RE.test(text);
}

function LinkCard({ text }: { text: string }) {
  URL_RE.lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;

  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(
        <span key={last} className="text-foreground/80">
          {text.slice(last, m.index)}
        </span>
      );
    }
    const url = m[0];
    let display: string;
    try {
      display = new URL(url).hostname;
    } catch {
      display = url;
    }
    parts.push(
      <a
        key={m.index}
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs text-general-primary hover:bg-muted"
      >
        {display}
      </a>
    );
    last = m.index + url.length;
  }

  if (last < text.length) {
    parts.push(
      <span key={last} className="text-foreground/80">
        {text.slice(last)}
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed">
      {parts}
    </div>
  );
}

export function AgentThinking({ text, isActive, defaultOpen = false }: Props) {
  const [open, setOpen] = React.useState(defaultOpen);

  if (!isActive && !text) return null;

  const steps = text
    ? text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex w-fit cursor-pointer items-center gap-2 text-xs font-medium",
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {isActive ? <MassicLoader size={18} animate /> : null}
        <span
          className={cn(
            isActive
              ? "italic bg-linear-to-r from-muted-foreground/55 via-muted-foreground/80 to-muted-foreground/55 bg-size-[200%_100%] bg-clip-text text-transparent animate-[shimmer_2s_linear_infinite]"
              : "text-muted-foreground/70"
          )}
        >
          Thinking
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>

      {open && steps.length > 0 ? (
        <div className="mt-3 flex flex-col">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                </span>
                <span className="mt-1 w-px flex-1 min-h-[12px] bg-border" />
              </div>

              <div className="min-w-0 pb-4 text-sm">
                {hasUrl(step) ? (
                  <LinkCard text={step} />
                ) : (
                  <p className="leading-relaxed text-foreground/80 whitespace-pre-wrap">
                    {step}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Done node */}
          {!isActive ? (
            <div className="flex gap-3 items-center">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-general-primary/40 bg-general-primary/10">
                <Check className="h-2.5 w-2.5 text-general-primary" />
              </span>
              <span className="text-xs font-medium text-general-primary">Done</span>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
              </span>
              <span className="text-xs text-muted-foreground italic">Thinking…</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
