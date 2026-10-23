"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import {
  WIDGET_FRAME_URL,
  WIDGET_ORIGIN,
  readWidgetMessage,
  widgetMessage,
} from "@/lib/customer-agent";
import { cn } from "@/lib/utils";

interface TestAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: unknown;
  siteId: string;
  siteKey: string;
  pageUrl: string;
}

function testPageContext(url: string) {
  return {
    url,
    canonical: null,
    title: "Customer agent test",
    description: null,
    h1: null,
    lang: "en",
    referrer: null,
    utm: {},
    hints: {},
  };
}

/** Hosts the real visitor frame with infer's site key; no legacy Main test session is involved. */
export function TestAgentDialog({
  open,
  onOpenChange,
  config,
  siteId,
  siteKey,
  pageUrl,
}: TestAgentDialogProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [booted, setBooted] = useState(false);
  const latest = useRef({ config, siteId, siteKey, pageUrl });
  latest.current = { config, siteId, siteKey, pageUrl };

  useEffect(() => {
    if (!open) {
      setBooted(false);
      return;
    }
    const post = (type: string, payload: unknown) =>
      frameRef.current?.contentWindow?.postMessage(
        widgetMessage(type, payload),
        WIDGET_ORIGIN,
      );
    const onMessage = (event: MessageEvent) => {
      const type = readWidgetMessage(event, frameRef.current);
      if (type === "ready") {
        const current = latest.current;
        post("init", {
          config: current.config,
          siteId: current.siteId,
          siteKey: current.siteKey,
          pageContext: testPageContext(current.pageUrl),
          layout: "panel",
          open: true,
        });
        setBooted(true);
      } else if (type === "close") {
        onOpenChange(false);
      } else if (type === "navigate") {
        const url = (
          event.data.payload as { url?: unknown } | undefined
        )?.url;
        if (
          typeof url === "string" &&
          /^(https:|tel:|mailto:)/.test(url)
        )
          window.open(url, "_blank", "noopener");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[620px] max-h-[calc(100vh-2rem)] w-[400px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Test your agent</DialogTitle>
        <DialogDescription className="sr-only">
          Live customer agent chat.
        </DialogDescription>
        {open && (
          <iframe
            ref={frameRef}
            src={WIDGET_FRAME_URL}
            title="Test your agent"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            className={cn("size-full border-0", !booted && "invisible")}
          />
        )}
        {!booted && (
          <div className="absolute inset-0 flex items-center justify-center">
            <MassicAmoebaLoader size={28} label="Starting test chat" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
