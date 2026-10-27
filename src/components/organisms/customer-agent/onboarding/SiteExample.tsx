"use client";

import { useEffect, useState } from "react";
import { ChevronDown, MessageCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { businessDomain } from "@/lib/business-domain-match";
import { cn } from "@/lib/utils";
import type { CustomerAgentConfig } from "@/types/customer-agent";

type Line = { from: "agent" | "customer"; text: string };

const REPLIES: Line[] = [
  { from: "customer", text: "Can I get a quote?" },
  { from: "agent", text: "Sure. What's your name and number?" },
  { from: "customer", text: "Sam, 555-0142" },
  { from: "agent", text: "Thanks, Sam. The team will call you soon." },
];

/**
 * The scene advances one stage per beat: launcher, panel opens, greeting, question, typing,
 * answer, details, typing, confirmation, lead notice.
 */
const BEATS_MS = [300, 900, 1400, 2300, 2700, 3400, 4300, 4700, 5400, 6200];
const FINAL_STAGE = BEATS_MS.length;
const TYPING_STAGES = new Set([5, 8]);
/** Lines visible once the scene reaches each stage, indexed by stage. */
const LINES_AT_STAGE = [0, 0, 0, 1, 2, 2, 3, 4, 4, 5, 5];

function siteHost(website: string | null | undefined, name: string): string {
  return businessDomain(website) || `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
}

/** Plays the scene once per `run`; jumps to the end when the user prefers reduced motion. */
function useScene(run: number): number {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage(FINAL_STAGE);
      return;
    }
    setStage(0);
    const timers = BEATS_MS.map((at, index) =>
      setTimeout(() => setStage(index + 1), at),
    );
    return () => timers.forEach(clearTimeout);
  }, [run]);
  return stage;
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 self-start rounded-lg bg-muted px-2.5 py-2 animate-in fade-in">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-pulse rounded-full bg-general-muted-foreground"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

/** Illustration of the agent on the business's website. Not interactive, so it never reads as a live chat. */
export function SiteExample({ config }: { config: CustomerAgentConfig }) {
  const { business, appearance } = config;
  const accent = appearance.theme.accent;
  const lines: Line[] = [
    { from: "agent", text: appearance.content.greeting },
    ...REPLIES,
  ];
  const [run, setRun] = useState(0);
  const stage = useScene(run);
  const open = stage >= 2;
  const shown = LINES_AT_STAGE[stage];
  const initial = business.name.trim().charAt(0).toUpperCase() || "A";
  const host = siteHost(business.website, business.name);
  const tint = `color-mix(in srgb, ${accent} 12%, white)`;

  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <figcaption className="text-xs font-medium tracking-wide text-general-muted-foreground uppercase">
          Example on your website
        </figcaption>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-xs font-normal text-general-muted-foreground hover:text-general-foreground"
          onClick={() => setRun((value) => value + 1)}
          disabled={stage < FINAL_STAGE}
        >
          <RotateCcw className="size-3" />
          Replay
        </Button>
      </div>

      <div
        className="overflow-hidden rounded-lg border border-general-border bg-white shadow-xs"
        aria-label={`Example chat on ${host}`}
        role="img"
      >
        <div
          className="flex h-8 items-center gap-1.5 border-b border-general-border bg-muted px-3"
          aria-hidden
        >
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="size-2 rounded-full bg-general-border-three"
            />
          ))}
          <span className="ml-2 flex h-5 max-w-[280px] min-w-0 flex-1 items-center truncate rounded border border-general-border bg-white px-2 text-xs text-general-muted-foreground">
            {host}
          </span>
        </div>

        <div className="relative h-[328px] overflow-hidden" aria-hidden>
          <div className="flex items-center justify-between border-b border-general-border px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-4 shrink-0 rounded"
                style={{ backgroundColor: accent }}
              />
              <span className="truncate text-xs font-medium text-general-foreground">
                {business.name}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              {[0, 1, 2].map((item) => (
                <span
                  key={item}
                  className="h-1.5 w-7 rounded-full bg-general-border"
                />
              ))}
            </div>
          </div>

          <div className="flex w-[44%] flex-col gap-2 px-4 pt-5">
            <span className="h-2.5 w-[90%] rounded bg-general-border-three" />
            <span className="h-2.5 w-[65%] rounded bg-general-border-three" />
            <span className="mt-1 h-1.5 w-[80%] rounded bg-general-border" />
            <span className="h-1.5 w-[55%] rounded bg-general-border" />
            <span
              className="mt-2 inline-flex h-6 w-fit items-center rounded-md px-2.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: accent }}
            >
              Get a quote
            </span>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="flex flex-col gap-1.5 rounded-md border border-general-border p-2"
                >
                  <span
                    className="size-4 rounded"
                    style={{ backgroundColor: tint }}
                  />
                  <span className="h-1 w-3/4 rounded-full bg-general-border-three" />
                  <span className="h-1 w-1/2 rounded-full bg-general-border" />
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "absolute bottom-4 left-4 rounded-lg border border-general-border-three bg-white px-3 py-2 shadow-xs transition-[opacity,transform] duration-300 ease-out",
              stage >= FINAL_STAGE
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0",
            )}
          >
            <p className="text-xs font-medium text-general-foreground">
              New lead
            </p>
            <p className="text-xs text-general-muted-foreground">
              Sam · 555-0142
            </p>
          </div>

          <div
            className={cn(
              "absolute right-4 bottom-[62px] flex w-[250px] origin-bottom-right flex-col overflow-hidden rounded-lg border border-general-border-three bg-white shadow-xs transition-[opacity,transform] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]",
              open
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-2 scale-[.85] opacity-0",
            )}
          >
            <div className="flex items-center gap-2 border-b border-general-border px-3 py-2">
              <span
                className="grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: accent }}
              >
                {initial}
              </span>
              <span className="truncate text-sm font-medium text-general-foreground">
                {business.name}
              </span>
            </div>
            <div className="flex h-[206px] flex-col justify-end gap-1.5 overflow-hidden p-3">
              {lines.slice(0, shown).map((line, index) => (
                <p
                  key={`${run}-${index}`}
                  className={cn(
                    "max-w-[85%] shrink-0 rounded-lg px-2.5 py-1.5 text-xs leading-snug motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1",
                    line.from === "agent"
                      ? "self-start bg-muted text-general-foreground"
                      : "self-end text-white",
                  )}
                  style={
                    line.from === "customer"
                      ? { backgroundColor: accent }
                      : undefined
                  }
                >
                  <span className="line-clamp-2">{line.text}</span>
                </p>
              ))}
              {TYPING_STAGES.has(stage) && <TypingDots />}
            </div>
          </div>

          <span
            className={cn(
              "absolute right-4 bottom-4 grid size-9 place-items-center rounded-full text-white transition-[opacity,transform] duration-300 ease-[cubic-bezier(.3,1.4,.5,1)]",
              stage >= 1 ? "scale-100 opacity-100" : "scale-50 opacity-0",
            )}
            style={{ backgroundColor: accent }}
          >
            {open ? (
              <ChevronDown className="size-4" />
            ) : (
              <MessageCircle className="size-4" />
            )}
          </span>
        </div>
      </div>
    </figure>
  );
}
