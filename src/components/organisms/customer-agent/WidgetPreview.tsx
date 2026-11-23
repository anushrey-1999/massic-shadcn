"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { WIDGET_FRAME_URL, WIDGET_ORIGIN, readWidgetMessage, widgetMessage } from "@/lib/customer-agent";
import { cn } from "@/lib/utils";

export type PreviewView = "welcome" | "conversation";
export type PreviewLayout = "panel" | "sidebar" | "sheet";
export type PreviewScheme = "light" | "dark";

interface WidgetPreviewProps {
  /** Public widget config (already validated); the frame drops anything malformed. */
  config: unknown;
  view: PreviewView;
  layout: PreviewLayout;
  /** Side the sidebar docks to; ignored by the other layouts. */
  side?: "left" | "right";
  /** Preview-only colour mode; customers on the live site follow their device. */
  scheme: PreviewScheme;
}

const READY_TIMEOUT_MS = 10_000;
const SIZES: Record<PreviewLayout, string> = {
  panel: "h-[580px] w-[380px]",
  sidebar: "h-[640px] w-[380px]",
  sheet: "h-[640px] w-[340px]",
};

/** Stand-in for the customer's page so the sidebar reads as docked beside it. */
function PageStub({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-y-0 flex w-[60px] flex-col gap-2 bg-general-primary-foreground p-3",
        side === "right" ? "left-0" : "right-0"
      )}
    >
      <span className="h-1.5 w-full rounded-full bg-general-border" />
      <span className="h-1.5 w-3/4 rounded-full bg-general-border" />
      <span className="mt-2 h-10 w-full rounded bg-general-border/70" />
      <span className="h-1.5 w-2/3 rounded-full bg-general-border" />
    </div>
  );
}

export function WidgetPreview({ config, view, layout, side = "right", scheme }: WidgetPreviewProps) {
  const sidebar = layout === "sidebar";
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setStatus("loading");
    const timeout = setTimeout(() => setStatus((current) => (current === "ready" ? current : "failed")), READY_TIMEOUT_MS);
    const onMessage = (event: MessageEvent) => {
      if (readWidgetMessage(event, frameRef.current) === "ready") {
        clearTimeout(timeout);
        setStatus("ready");
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
    };
  }, [attempt]);

  useEffect(() => {
    if (status !== "ready") return;
    frameRef.current?.contentWindow?.postMessage(widgetMessage("preview", { config, view, layout, scheme }), WIDGET_ORIGIN);
  }, [status, config, view, layout, scheme]);

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-general-border shadow-xs transition-[width,height,border-radius] duration-200",
        scheme === "dark" ? "bg-neutral-900" : "bg-white",
        layout === "sheet" ? "rounded-[20px]" : "rounded-lg",
        SIZES[layout]
      )}
    >
      {sidebar && <PageStub side={side} />}
      <div
        className={cn(
          "absolute inset-y-0",
          sidebar
            ? cn("w-[320px] border-general-border", side === "right" ? "right-0 border-l" : "left-0 border-r")
            : "inset-x-0"
        )}
      >
        <iframe
          key={attempt}
          ref={frameRef}
          src={`${WIDGET_FRAME_URL}?preview=1`}
          title="Customer Agent preview"
          sandbox="allow-scripts allow-same-origin"
          className={cn("size-full border-0", status !== "ready" && "invisible")}
        />
      </div>
      {status !== "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          {status === "loading" ? (
            <MassicAmoebaLoader size={28} label="Loading preview" />
          ) : (
            <>
              <p className="text-sm text-general-muted-foreground">The preview didn&apos;t load.</p>
              <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
                <RefreshCw className="size-4" />
                Try again
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
