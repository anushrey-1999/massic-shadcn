"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getBaseURLByPlatform } from "@/hooks/use-api";
import { usesEmptyLayout } from "@/lib/layout-config";
import {
  releaseRequestCapture,
  setRequestCapture,
  type RequestCaptureAuthorization,
} from "@/lib/developer-mode/request-capture";
import type { RequestApiTarget } from "@/lib/developer-mode/request-privacy";
import { useAuthStore } from "@/store/auth-store";
import { decodeJwt } from "@/utils/jwt";

const DeveloperModeContext = createContext(false);
const CHECK_INTERVAL_MS = 30_000;
const CHECK_TIMEOUT_MS = 10_000;
const INFER_PROXY_ROUTES = [
  "/api/chatbot/talk",
  "/api/chatbot/planner",
  "/api/refine-plan/talk",
];

function getBusinessId(pathname: string) {
  return (
    /^\/business\/([^/]+)/.exec(pathname)?.[1] ??
    /^\/pitches\/([a-f\d-]{36})(?:\/|$)/i.exec(pathname)?.[1] ??
    null
  );
}

let lastToken: string | null = null;
let lastSession: string | null = null;
function getSessionScope(token: string | null) {
  if (token === lastToken) return lastSession;
  lastToken = token;
  const user = token ? decodeJwt(token)?.user : null;
  lastSession =
    user?.id && user?.sesid
      ? JSON.stringify([
          user.id,
          user.sesid,
          user.accountUniqueId ?? user.uniqueId,
        ])
      : null;
  return lastSession;
}

// Scopes the server most recently confirmed in this tab. They let capture resume on
// reload before the confirmation request returns; the server answer still decides.
const CONFIRMED_SCOPES_KEY = "massic:developer-mode:confirmed-scopes";
const MAX_CONFIRMED_SCOPES = 20;

function readConfirmedScopes(): string[] {
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(CONFIRMED_SCOPES_KEY) ?? "[]",
    );
    return Array.isArray(value)
      ? value.filter((scope): scope is string => typeof scope === "string")
      : [];
  } catch {
    return [];
  }
}

function rememberScope(scope: string, enabled: boolean) {
  const others = readConfirmedScopes().filter((item) => item !== scope);
  const next = enabled
    ? [scope, ...others].slice(0, MAX_CONFIRMED_SCOPES)
    : others;
  try {
    sessionStorage.setItem(CONFIRMED_SCOPES_KEY, JSON.stringify(next));
  } catch {
    // Without storage, capture simply starts after the server confirms.
  }
}

function resumeConfirmedScope(authorization: RequestCaptureAuthorization) {
  try {
    if (readConfirmedScopes().includes(authorization.key))
      setRequestCapture(authorization);
  } catch {
    // Capture then starts once the server confirms.
  }
}

function buildCaptureConfig(
  scope: string,
  session: string,
  businessId: string | null,
) {
  const nodeBase = getBaseURLByPlatform("node").replace(/\/+$/, "");
  const inferBase = getBaseURLByPlatform("python");
  const origin = window.location.origin;
  const apiTargets: RequestApiTarget[] = [
    { base: new URL(nodeBase, origin), backend: "main" },
    { base: new URL(inferBase, origin), backend: "infer" },
    { base: new URL("/api", origin), backend: null },
    ...INFER_PROXY_ROUTES.map(
      (path): RequestApiTarget => ({
        base: new URL(path, origin),
        backend: "infer",
        exact: true,
      }),
    ),
  ];
  // Profile knowledge uses Infer v2 even when the workspace defaults to v1.
  const inferV2Base = inferBase.replace(/\/v\d+\/?$/, "/v2");
  if (inferV2Base !== inferBase)
    apiTargets.push({ base: new URL(inferV2Base, origin), backend: "infer" });
  const endpoint = new URL(nodeBase + "/developer-mode", origin);
  if (businessId) endpoint.searchParams.set("businessId", businessId);

  const authorization: RequestCaptureAuthorization = {
    key: scope,
    apiTargets,
    businessId,
    isCurrent() {
      const path = window.location.pathname;
      return (
        !usesEmptyLayout(path) &&
        getBusinessId(path) === businessId &&
        getSessionScope(useAuthStore.getState().token) === session
      );
    },
  };
  return { authorization, endpoint };
}

export function DeveloperModeProvider({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) {
  const token = useAuthStore((state) => state.token);
  const session = getSessionScope(token);
  const businessId = getBusinessId(pathname);
  const scope = session ? JSON.stringify([session, businessId]) : null;
  const [enabledScope, setEnabledScope] = useState<string | null>(null);
  const config = useMemo(() => {
    if (!scope || !session || typeof window === "undefined") return null;
    try {
      return buildCaptureConfig(scope, session, businessId);
    } catch {
      return null;
    }
  }, [businessId, scope, session]);

  // Page effects run before this provider's passive effect, so resuming a previously
  // confirmed scope in a layout effect is what catches requests fired on load. It also
  // re-claims the scope on remount before the deferred release drops it. A negative
  // server answer below still discards everything captured.
  useLayoutEffect(() => {
    if (config) resumeConfirmedScope(config.authorization);
  }, [config]);

  useEffect(() => {
    if (!config) return;
    const { authorization, endpoint } = config;
    resumeConfirmedScope(authorization);
    let disposed = false;
    let controller: AbortController | null = null;
    let nextCheck: ReturnType<typeof setTimeout> | undefined;

    function isCurrent() {
      return !disposed && authorization.isCurrent();
    }

    async function check() {
      const currentToken = useAuthStore.getState().token;
      if (
        !isCurrent() ||
        !currentToken ||
        document.visibilityState === "hidden" ||
        controller
      )
        return;
      clearTimeout(nextCheck);
      const request = new AbortController();
      controller = request;
      const deadline = setTimeout(() => request.abort(), CHECK_TIMEOUT_MS);
      let enabled = false;
      let answered = false;
      try {
        const response = await fetch(endpoint, {
          headers: { Token: currentToken },
          cache: "no-store",
          signal: request.signal,
        });
        if (response.ok) {
          enabled = (await response.json())?.enabled === true;
          answered = true;
        }
      } catch {
        // This feature can fail closed independently of the rest of the app.
      } finally {
        clearTimeout(deadline);
        controller = null;
      }

      if (!isCurrent()) return;
      // Aborts on reload and network blips fail closed now but must not forget the
      // confirmation; only a server answer changes it.
      if (answered) rememberScope(authorization.key, enabled);
      try {
        setRequestCapture(enabled ? authorization : null);
      } catch {
        enabled = false;
      }
      setEnabledScope(enabled ? authorization.key : null);
      if (enabled && document.visibilityState === "visible") {
        nextCheck = setTimeout(check, CHECK_INTERVAL_MS);
      }
    }

    void check();
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      disposed = true;
      controller?.abort();
      clearTimeout(nextCheck);
      try {
        releaseRequestCapture(authorization.key);
      } catch {}
      setEnabledScope(null);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [config]);

  return (
    <DeveloperModeContext.Provider
      value={scope !== null && enabledScope === scope}
    >
      {children}
    </DeveloperModeContext.Provider>
  );
}

export function useDeveloperMode() {
  return useContext(DeveloperModeContext);
}
