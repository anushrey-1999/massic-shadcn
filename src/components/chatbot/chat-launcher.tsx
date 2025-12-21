"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PlanModal } from "@/components/molecules/settings/PlanModal";
import { useEntitlementGate } from "@/hooks/use-entitlement-gate";

type Props = {
  businessId: string;
  businessName?: string;
};

const PENDING_INPUT_KEY = "chatbot:pendingInput";

export function ChatLauncher({ businessId, businessName }: Props) {
  const pathname = usePathname();

  const [upgradeOpen, setUpgradeOpen] = React.useState(false);

  const {
    entitled,
    gateLoading,
    subscriptionLoading,
    getCurrentPlan,
    computedAlertMessage,
    handleSubscribe,
  } = useEntitlementGate({ entitlement: "aiChat", businessId });

  const derivedBusinessId = React.useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/);
    return match?.[1] || null;
  }, [pathname]);

  const effectiveBusinessId = businessId || derivedBusinessId;

  const [ui, setUi] = React.useState<"closed" | "mini">("closed");
  const [miniInput, setMiniInput] = React.useState("");

  const isOnFullRoute = pathname.includes("/chat/full");

  const fullRoute = effectiveBusinessId ? `/business/${effectiveBusinessId}/chat/full` : null;

  const handleSend = React.useCallback(() => {
    const text = miniInput.trim();
    if (!text) return;

    if (!fullRoute) return;

    if (!entitled) {
      if (!gateLoading) setUpgradeOpen(true);
      return;
    }

    try {
      sessionStorage.setItem(PENDING_INPUT_KEY, text);
    } catch {
      // ignore
    }

    setMiniInput("");
    setUi("closed");

    window.location.assign(fullRoute);
  }, [miniInput, fullRoute, entitled, gateLoading]);

  if (isOnFullRoute) return null;

  return (
    <>
      <PlanModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        currentPlan={getCurrentPlan()}
        showFooterButtons={true}
        showAlertBar={true}
        alertSeverity="error"
        alertMessage={computedAlertMessage}
        isDescription={false}
        onSelectPlan={handleSubscribe}
        loading={subscriptionLoading}
      />

      {ui === "mini" ? (
        <div className="fixed bottom-24 right-6 z-50 w-[min(92vw,420px)]">
          <Card className="rounded-2xl border-border bg-card/95 shadow-lg backdrop-blur supports-backdrop-filter:bg-card/80">
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Image src="/AiStar.png" alt="Massic" width={18} height={18} />
                <span className="truncate">Ask Massic{businessName ? ` · ${businessName}` : ""}</span>
              </CardTitle>
              <div className="text-xs text-muted-foreground">Press Enter to send · Shift+Enter for new line</div>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="relative">
                <Textarea
                  value={miniInput}
                  onChange={(e) => setMiniInput(e.target.value)}
                  placeholder="Type your question…"
                  className="min-h-24 resize-none pr-12"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  className="absolute bottom-2 right-2"
                  onClick={handleSend}
                  disabled={!miniInput.trim()}
                  aria-label="Send"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => {
          if (!entitled) {
            if (!gateLoading) setUpgradeOpen(true);
            return;
          }
          setUi((prev) => (prev === "mini" ? "closed" : "mini"));
        }}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full p-0 shadow-lg",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          ui === "mini" ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""
        )}
        aria-label="Ask Massic"
      >
        <span className="sr-only">Ask Massic</span>
        <Image src="/AiStar.png" alt="Massic" width={28} height={28} />
      </Button>
    </>
  );
}
