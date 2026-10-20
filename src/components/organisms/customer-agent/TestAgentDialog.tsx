"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { useCustomerAgentTestSession } from "@/hooks/use-customer-agent";
import { WIDGET_FRAME_URL, WIDGET_ORIGIN, readWidgetMessage, widgetMessage } from "@/lib/customer-agent";
import { cn } from "@/lib/utils";

interface TestAgentDialogProps {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: unknown;
  /** Page the test conversation pretends to be on. */
  pageUrl: string;
}

const LAYOUT = "panel";

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

/** Hosts the live chat frame the way the loader does, using an owner test session. */
export function TestAgentDialog({ businessId, open, onOpenChange, config, pageUrl }: TestAgentDialogProps) {
  const createSession = useCustomerAgentTestSession(businessId);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [booted, setBooted] = useState(false);
  const latest = useRef({ config, pageUrl, createSession });
  latest.current = { config, pageUrl, createSession };

  useEffect(() => {
    if (!open) {
      setBooted(false);
      return;
    }
    const post = (type: string, payload: unknown) =>
      frameRef.current?.contentWindow?.postMessage(widgetMessage(type, payload), WIDGET_ORIGIN);

    const sendSession = async (type: "init" | "session") => {
      const { config: currentConfig, pageUrl: url, createSession: create } = latest.current;
      try {
        const session = await create();
        if (type === "init") {
          post("init", { config: currentConfig, session, pageContext: testPageContext(url), layout: LAYOUT, open: true });
        } else {
          post("session", { session });
        }
      } catch {
        post("session_error", { code: "unavailable", config: currentConfig, layout: LAYOUT, open: true });
        if (type === "init") toast.error("Couldn't start a test chat", { description: "Please try again." });
      } finally {
        setBooted(true);
      }
    };

    const onMessage = (event: MessageEvent) => {
      const type = readWidgetMessage(event, frameRef.current);
      if (type === "ready") void sendSession("init");
      else if (type === "request_session") void sendSession("session");
      else if (type === "close") onOpenChange(false);
      else if (type === "navigate") {
        const url = (event.data.payload as { url?: unknown } | undefined)?.url;
        if (typeof url === "string" && /^(https:|tel:|mailto:)/.test(url)) window.open(url, "_blank", "noopener");
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
          A live chat with your agent. Test conversations don&apos;t count toward usage.
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
            <MassicAmoebaLoader size={28} label="Starting a test chat" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
