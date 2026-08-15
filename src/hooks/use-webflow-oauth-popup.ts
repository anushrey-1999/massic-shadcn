"use client";

import React from "react";
import { useStartWebflowOnboarding } from "@/hooks/use-webflow-onboarding";

type WebflowOAuthMessage = {
  source?: string;
  ok?: boolean;
  onboarding?: boolean;
  sessionId?: string;
  message?: string;
};

type Outcome = { sessionId: string } | { error: Error };

const POPUP_CLOSED_POLL_MS = 500;
const PLACEHOLDER_MARKUP =
  '<p style="font-family: system-ui, sans-serif; padding: 24px;">Opening Webflow authorization...</p>';

/**
 * Runs the Webflow onboarding OAuth handshake in a popup and resolves with the fresh
 * onboarding session id. Shared by the connect step and the post-create recovery card,
 * which needs a brand new session when the original one lapses before finalize.
 */
export function useWebflowOauthPopup() {
  const startOauth = useStartWebflowOnboarding();
  const [isAwaitingAuthorization, setIsAwaitingAuthorization] =
    React.useState(false);
  const settleRef = React.useRef<((outcome: Outcome) => void) | null>(null);
  const inFlightRef = React.useRef(false);
  const pollTimerRef = React.useRef<number | null>(null);

  const clearPollTimer = React.useCallback(() => {
    if (pollTimerRef.current === null) return;
    window.clearInterval(pollTimerRef.current);
    pollTimerRef.current = null;
  }, []);

  const settle = React.useCallback(
    (outcome: Outcome) => {
      clearPollTimer();
      const settleOutcome = settleRef.current;
      settleRef.current = null;
      inFlightRef.current = false;
      setIsAwaitingAuthorization(false);
      settleOutcome?.(outcome);
    },
    [clearPollTimer],
  );

  React.useEffect(() => {
    const onMessage = (event: MessageEvent<WebflowOAuthMessage>) => {
      const payload = event.data;
      if (
        !payload ||
        payload.source !== "massic-webflow-oauth" ||
        payload.onboarding !== true ||
        !settleRef.current
      ) {
        return;
      }

      if (payload.ok && payload.sessionId) {
        settle({ sessionId: payload.sessionId });
        return;
      }
      settle({
        error: new Error(
          payload.message ||
            "Webflow authorization did not complete. Please try again.",
        ),
      });
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [settle]);

  React.useEffect(
    () => () => {
      clearPollTimer();
      settleRef.current = null;
      inFlightRef.current = false;
    },
    [clearPollTimer],
  );

  const connect = React.useCallback(async (): Promise<string> => {
    if (inFlightRef.current) {
      throw new Error("Webflow authorization is already in progress.");
    }
    inFlightRef.current = true;

    const popup = window.open("about:blank", "_blank");
    if (popup) {
      try {
        popup.document.title = "Connecting Webflow";
        popup.document.body.innerHTML = PLACEHOLDER_MARKUP;
      } catch {
        // Browser restrictions can prevent access to the temporary window.
      }
    }

    let authorizationUrl: string;
    try {
      ({ authorizationUrl } = await startOauth.mutateAsync());
    } catch (error: any) {
      popup?.close();
      inFlightRef.current = false;
      throw new Error(
        error?.message || "Could not start Webflow authorization.",
      );
    }

    if (!popup || popup.closed) {
      // Popup blocked: fall back to a full-page redirect and never settle, since this
      // document is being replaced.
      window.location.assign(authorizationUrl);
      return new Promise<string>(() => {});
    }

    popup.location.replace(authorizationUrl);
    popup.focus();
    setIsAwaitingAuthorization(true);

    return new Promise<string>((resolve, reject) => {
      settleRef.current = (outcome) => {
        if ("sessionId" in outcome) resolve(outcome.sessionId);
        else reject(outcome.error);
      };
      pollTimerRef.current = window.setInterval(() => {
        if (!popup.closed) return;
        settle({
          error: new Error(
            "The Webflow authorization window was closed before connecting.",
          ),
        });
      }, POPUP_CLOSED_POLL_MS);
    });
  }, [settle, startOauth]);

  return {
    connect,
    isConnecting: startOauth.isPending || isAwaitingAuthorization,
  };
}
