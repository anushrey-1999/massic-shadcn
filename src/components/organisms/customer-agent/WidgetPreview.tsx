"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { WIDGET_FRAME_URL, WIDGET_ORIGIN, readWidgetMessage, widgetMessage } from "@/lib/customer-agent";
import { cn } from "@/lib/utils";

export type PreviewView = "welcome" | "conversation";
export type PreviewLayout = "panel" | "sheet";

interface WidgetPreviewProps {
  /** Public widget config (already validated); the frame drops anything malformed. */
  config: unknown;
  view: PreviewView;
  layout: PreviewLayout;
}

const READY_TIMEOUT_MS = 10_000;
const SIZES: Record<PreviewLayout, string> = {
  panel: "h-[580px] w-[380px]",
  sheet: "h-[640px] w-[340px]",
};

export function WidgetPreview({ config, view, layout }: WidgetPreviewProps) {
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
    frameRef.current?.contentWindow?.postMessage(widgetMessage("preview", { config, view, layout }), WIDGET_ORIGIN);
  }, [status, config, view, layout]);

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-general-border bg-white shadow-xs transition-[width,height,border-radius] duration-200",
        layout === "sheet" ? "rounded-[20px]" : "rounded-lg",
        SIZES[layout]
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
