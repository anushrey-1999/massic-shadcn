"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { PlanModal } from "@/components/molecules/settings/PlanModal";
import { useEntitlementGate } from "@/hooks/use-entitlement-gate";
import { AskMassicOverlay } from "./ask-massic-overlay";

const CHATBOT_STORAGE_PREFIX = "massic:chatbot:";
const LEGACY_PENDING_INPUT_KEY = "chatbot:pendingInput";

let didClearChatsForThisPageLoad = false;

function clearAllMassicBotChats() {
  if (typeof window === "undefined") return;

  const removePrefixedKeys = (storage: Storage) => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(CHATBOT_STORAGE_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  };

  try {
    removePrefixedKeys(sessionStorage);
  } catch {
    // ignore
  }

  try {
    removePrefixedKeys(localStorage);
    localStorage.removeItem(LEGACY_PENDING_INPUT_KEY);
  } catch {
    // ignore
  }
}

function isHardReloadNavigation(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const entry = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;
    return entry?.type === "reload";
  } catch {
    return false;
  }
}

type AskMassicOverlayContextValue = {
  open: (anchorRect?: AnchorRect) => void;
  close: () => void;
};

export type AnchorRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

const AskMassicOverlayContext = React.createContext<
  AskMassicOverlayContextValue | undefined
>(undefined);

export function useAskMassicOverlayOptional() {
  return React.useContext(AskMassicOverlayContext);
}

type Props = {
  businessId: string;
  children: React.ReactNode;
};

export function AskMassicOverlayProvider({ businessId, children }: Props) {
  const pathname = usePathname();

  const [overlayOpen, setOverlayOpen] = React.useState(false);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [anchorRect, setAnchorRect] = React.useState<AnchorRect | null>(null);

  const {
    entitled,
    gateLoading,
    subscriptionLoading,
    getCurrentPlan,
    computedAlertMessage,
    handleSubscribe,
  } = useEntitlementGate({
    entitlement: "aiChat",
    businessId,
    alertMessage: "Upgrade your plan to unlock Ask Massic bot.",
  });

  React.useEffect(() => {
    if (didClearChatsForThisPageLoad) return;
    if (!isHardReloadNavigation()) return;
    clearAllMassicBotChats();
    didClearChatsForThisPageLoad = true;
  }, []);

  React.useEffect(() => {
    setOverlayOpen(false);
    setUpgradeOpen(false);
    setAnchorRect(null);
  }, [businessId]);

  React.useEffect(() => {
    if (!overlayOpen) return;
    const match = pathname.match(/^\/business\/([^/]+)/);
    const pathBusinessId = match?.[1];
    if (!pathBusinessId || pathBusinessId !== businessId) setOverlayOpen(false);
  }, [pathname, businessId, overlayOpen]);

  const open = React.useCallback(
    (nextAnchorRect?: AnchorRect) => {
    if (!entitled) {
      if (!gateLoading) setUpgradeOpen(true);
      return;
    }
    setAnchorRect(nextAnchorRect ?? null);
    setOverlayOpen(true);
    },
    [entitled, gateLoading]
  );

  const close = React.useCallback(() => {
    setOverlayOpen(false);
    setAnchorRect(null);
  }, []);

  return (
    <AskMassicOverlayContext.Provider value={{ open, close }}>
      {children}

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

      <AskMassicOverlay
        open={overlayOpen}
        onOpenChange={setOverlayOpen}
        businessId={businessId}
        anchorRect={anchorRect}
      />
    </AskMassicOverlayContext.Provider>
  );
}
