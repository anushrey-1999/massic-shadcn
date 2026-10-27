"use client";

import { useEffect, useRef, useState } from "react";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import {
  WIDGET_FRAME_URL,
  WIDGET_ORIGIN,
  readWidgetMessage,
  widgetMessage,
} from "@/lib/customer-agent";
import { cn } from "@/lib/utils";

export interface TestAgentFrameProps {
  config: unknown;
  siteId: string;
  siteKey: string;
  pageUrl: string;
  /** Called when the chat's own close button is pressed. */
  onClose?: () => void;
  className?: string;
}

function testPageContext(url: string) {
  return {
    url,
    canonical: null,
    title: "Customer Agent test",
    description: null,
    h1: null,
    lang: "en",
    referrer: null,
    utm: {},
    hints: {},
  };
}

/** Hosts the real customer chat frame with infer's site key; no legacy Main test session is involved. */
export function TestAgentFrame({ config, siteId, siteKey, pageUrl, onClose, className }: TestAgentFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [booted, setBooted] = useState(false);
  const latest = useRef({ config, siteId, siteKey, pageUrl, onClose });
  latest.current = { config, siteId, siteKey, pageUrl, onClose };

  useEffect(() => {
    const post = (type: string, payload: unknown) =>
      frameRef.current?.contentWindow?.postMessage(widgetMessage(type, payload), WIDGET_ORIGIN);
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
        latest.current.onClose?.();
      } else if (type === "navigate") {
        const url = (event.data.payload as { url?: unknown } | undefined)?.url;
        if (typeof url === "string" && /^(https:|tel:|mailto:)/.test(url)) window.open(url, "_blank", "noopener");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <iframe
        ref={frameRef}
        src={WIDGET_FRAME_URL}
        title="Test your agent"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        className={cn("size-full border-0", !booted && "invisible")}
      />
      {!booted && (
        <div className="absolute inset-0 flex items-center justify-center">
          <MassicAmoebaLoader size={28} label="Starting test chat" />
        </div>
      )}
    </div>
  );
}
