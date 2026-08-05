"use client";

import React from "react";
import { useRoleGuard } from "@/hooks/use-permissions";
import { ACCOUNT_ROLES } from "@/lib/permissions";
import { CreateBusinessPlatformChooser } from "./CreateBusinessPlatformChooser";
import { WebflowManualCreateBusinessFlow } from "./WebflowManualCreateBusinessFlow";

type CreatePlatform = "webflow" | "other";

const PLATFORM_STORAGE_KEY = "massic:create-business:platform";
const WEBFLOW_SESSION_STORAGE_KEY = "massic:create-business:webflow-session";

function EnabledCreateBusinessGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowed = useRoleGuard({
    allowedRoles: [ACCOUNT_ROLES.OWNER, ACCOUNT_ROLES.ADMIN],
    fallbackPath: "/settings",
  });
  const [platform, setPlatform] = React.useState<CreatePlatform | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [oauthError, setOauthError] = React.useState<string | null>(null);
  const [isRestoring, setIsRestoring] = React.useState(true);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPlatform = params.get("platform");
    const callbackSessionId = params.get("webflowSessionId");
    const storedPlatform = window.sessionStorage.getItem(PLATFORM_STORAGE_KEY);
    const storedSessionId = window.sessionStorage.getItem(
      WEBFLOW_SESSION_STORAGE_KEY,
    );
    const nextPlatform: CreatePlatform | null =
      requestedPlatform === "webflow" || callbackSessionId
        ? "webflow"
        : storedPlatform === "webflow" || storedPlatform === "other"
          ? storedPlatform
          : null;

    setPlatform(nextPlatform);
    setSessionId(callbackSessionId || storedSessionId || null);
    if (nextPlatform === "webflow") {
      window.sessionStorage.setItem(PLATFORM_STORAGE_KEY, nextPlatform);
    } else {
      window.sessionStorage.removeItem(PLATFORM_STORAGE_KEY);
    }
    if (callbackSessionId) {
      window.sessionStorage.setItem(
        WEBFLOW_SESSION_STORAGE_KEY,
        callbackSessionId,
      );
    }
    if (params.get("webflowOnboarding") === "error") {
      setOauthError(
        "Webflow authorization did not complete. Please try again.",
      );
    }

    if (params.has("webflowSessionId") || params.has("webflowOnboarding")) {
      params.delete("webflowSessionId");
      params.delete("webflowOnboarding");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `/create-business${query ? `?${query}` : ""}`,
      );
    }
    setIsRestoring(false);
  }, []);

  const persistPlatform = React.useCallback(
    (nextPlatform: CreatePlatform | null) => {
      setPlatform(nextPlatform);
      if (nextPlatform === "webflow") {
        window.sessionStorage.setItem(PLATFORM_STORAGE_KEY, nextPlatform);
      } else {
        window.sessionStorage.removeItem(PLATFORM_STORAGE_KEY);
      }
    },
    [],
  );

  const persistSessionId = React.useCallback((nextSessionId: string | null) => {
    setSessionId(nextSessionId);
    setOauthError(null);
    if (nextSessionId) {
      window.sessionStorage.setItem(WEBFLOW_SESSION_STORAGE_KEY, nextSessionId);
    } else {
      window.sessionStorage.removeItem(WEBFLOW_SESSION_STORAGE_KEY);
    }
  }, []);

  const clearOnboardingStorage = React.useCallback(() => {
    window.sessionStorage.removeItem(PLATFORM_STORAGE_KEY);
    window.sessionStorage.removeItem(WEBFLOW_SESSION_STORAGE_KEY);
  }, []);

  if (!allowed || isRestoring) return null;
  if (platform === "other") return children;

  if (platform === "webflow") {
    return (
      <WebflowManualCreateBusinessFlow
        sessionId={sessionId}
        initialOauthError={oauthError}
        onSessionId={persistSessionId}
        onChooseAnotherPlatform={() => {
          persistSessionId(null);
          persistPlatform(null);
        }}
        onComplete={clearOnboardingStorage}
      />
    );
  }

  return <CreateBusinessPlatformChooser onSelect={persistPlatform} />;
}

export function CreateBusinessFeatureGate({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  if (!enabled) return children;
  return <EnabledCreateBusinessGate>{children}</EnabledCreateBusinessGate>;
}
