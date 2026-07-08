"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAccessRequestStatus,
  useContributorStatus,
  useCreateAccessRequestVisit,
} from "@/hooks/use-access-request-flow";
import { getBaseURLByPlatform } from "@/hooks/use-api";
import type { Product } from "@/types/access-request";
import {
  clearAccessSession,
  readAccessSession,
  writeAccessSession,
} from "@/utils/access-request-session";
import { AccessRequestIntroCard } from "./AccessRequestIntroCard";
import { AccessRequestStatusCard } from "./AccessRequestStatusCard";
import { ContributorAccessWizard } from "./ContributorAccessWizard";

interface AccessRequestRestoreGateProps {
  inviteToken?: string | null;
  querySessionToken?: string | null;
  token: string;
}

type RestorePhase = "idle" | "restoring" | "ready" | "failed";

function getHttpStatus(error: unknown) {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

function restoreKey(token: string, inviteToken?: string | null, querySessionToken?: string | null) {
  return `${token}:${inviteToken || ""}:${querySessionToken || ""}`;
}

function getVisitSessionToken(result: { sessionToken?: string | null }) {
  if (!result.sessionToken) {
    throw new Error("Unable to create access session. Please try again.");
  }

  return result.sessionToken;
}

export function AccessRequestRestoreGate({
  inviteToken,
  querySessionToken,
  token,
}: AccessRequestRestoreGateProps) {
  const requestStatus = useAccessRequestStatus(token);
  const { mutateAsync: createVisit, isPending: isCreatingVisit } = useCreateAccessRequestVisit(token);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [restorePhase, setRestorePhase] = useState<RestorePhase>("idle");
  const [, setRestoreError] = useState<unknown>(null);
  const [contributorSessionRecovered, setContributorSessionRecovered] = useState(false);
  const restoreAttemptRef = useRef(0);
  const startedRestoreKeyRef = useRef<string | null>(null);

  const requestState = requestStatus.data?.requestStatus;
  const canPrepareSession =
    !!token &&
    !requestStatus.isLoading &&
    !requestStatus.isError &&
    requestState !== "expired" &&
    requestState !== "completed";

  const applySession = useCallback(
    (nextSessionToken: string) => {
      writeAccessSession(token, nextSessionToken);
      setSessionToken(nextSessionToken);
    },
    [token]
  );

  const createFreshSession = useCallback(async () => {
    const result = await createVisit({ inviteToken, sessionToken: null });
    const nextSessionToken = getVisitSessionToken(result);
    applySession(nextSessionToken);
    return nextSessionToken;
  }, [applySession, createVisit, inviteToken]);

  useEffect(() => {
    if (!canPrepareSession) return;

    const key = restoreKey(token, inviteToken, querySessionToken);
    if (startedRestoreKeyRef.current === key) return;
    startedRestoreKeyRef.current = key;

    const attemptId = ++restoreAttemptRef.current;

    async function restoreSession() {
      setRestorePhase("restoring");
      setRestoreError(null);

      const storedSession = querySessionToken || readAccessSession(token);
      if (querySessionToken) writeAccessSession(token, querySessionToken);

      try {
        const result = await createVisit({ inviteToken, sessionToken: storedSession });
        if (restoreAttemptRef.current !== attemptId) return;

        applySession(getVisitSessionToken(result));
        setRestorePhase("ready");
      } catch (error) {
        if (restoreAttemptRef.current !== attemptId) return;

        if (storedSession) {
          clearAccessSession(token);

          try {
            await createFreshSession();
            if (restoreAttemptRef.current === attemptId) setRestorePhase("ready");
            return;
          } catch (fallbackError) {
            if (restoreAttemptRef.current !== attemptId) return;

            setSessionToken(null);
            setRestoreError(fallbackError);
            setRestorePhase("failed");
            return;
          }
        }

        setSessionToken(null);
        setRestoreError(error);
        setRestorePhase("failed");
      }
    }

    void restoreSession();
  }, [
    applySession,
    canPrepareSession,
    createFreshSession,
    createVisit,
    inviteToken,
    querySessionToken,
    token,
  ]);

  const contributorStatus = useContributorStatus(token, sessionToken);
  const contributorStatusCode = getHttpStatus(contributorStatus.error);

  useEffect(() => {
    if (
      !sessionToken ||
      !contributorStatus.isError ||
      contributorStatusCode !== 401 ||
      contributorSessionRecovered
    ) {
      return;
    }

    const attemptId = ++restoreAttemptRef.current;

    async function recoverContributorSession() {
      setContributorSessionRecovered(true);
      setRestorePhase("restoring");
      clearAccessSession(token);

      try {
        await createFreshSession();
        if (restoreAttemptRef.current === attemptId) setRestorePhase("ready");
      } catch (error) {
        if (restoreAttemptRef.current !== attemptId) return;

        setSessionToken(null);
        setRestoreError(error);
        setRestorePhase("failed");
      }
    }

    void recoverContributorSession();
  }, [
    contributorSessionRecovered,
    contributorStatus.isError,
    contributorStatusCode,
    createFreshSession,
    sessionToken,
    token,
  ]);

  const products = useMemo<Product[]>(() => {
    return requestStatus.data?.request?.products || requestStatus.data?.steps?.map((step) => step.product as Product) || [];
  }, [requestStatus.data?.request?.products, requestStatus.data?.steps]);

  const agencyEmail = requestStatus.data?.request?.agencyEmail || "the agency";
  const agencyName = requestStatus.data?.request?.agencyName || agencyEmail;
  const expiresAt = requestStatus.data?.request?.expiresAt;

  const retryRestore = useCallback(() => {
    startedRestoreKeyRef.current = null;
    restoreAttemptRef.current += 1;
    setSessionToken(null);
    setRestoreError(null);
    setContributorSessionRecovered(false);
    setRestorePhase("idle");
  }, []);

  const continueWithGoogle = useCallback(() => {
    const baseUrl = getBaseURLByPlatform("node");
    const sessionQuery = sessionToken ? `&c=${encodeURIComponent(sessionToken)}` : "";
    window.location.href = `${baseUrl}/access-request/auth/google/start?token=${token}${sessionQuery}`;
  }, [sessionToken, token]);

  if (requestStatus.isLoading) {
    return (
      <AccessRequestStatusCard
        tone="loading"
        title="Loading your access check"
        description="Checking whether this link is still valid."
      />
    );
  }

  if (requestStatus.isError || !requestStatus.data) {
    const isExpired = getHttpStatus(requestStatus.error) === 410;
    return (
      <AccessRequestStatusCard
        tone={isExpired ? "expired" : "error"}
        title={isExpired ? "This link has expired" : "This link is not valid"}
        description="Please ask the agency for a new link."
      />
    );
  }

  if (requestState === "expired") {
    return (
      <AccessRequestStatusCard
        tone="expired"
        title="This link has expired"
        description="Please ask the agency for a new link."
      />
    );
  }

  if (requestState === "completed") {
    return (
      <AccessRequestStatusCard
        tone="completed"
        title="Access connected"
        description="Massic now has the access it needs. You can close this page."
      />
    );
  }

  if (restorePhase === "idle" || restorePhase === "restoring") {
    return (
      <AccessRequestStatusCard
        tone="loading"
        title="Preparing your access check"
        description="Checking whether you've opened this link before."
      />
    );
  }

  if (restorePhase === "failed") {
    return (
      <AccessRequestStatusCard
        tone="error"
        title="We could not load this link"
        description="Please refresh the page or ask the agency for a new link."
        actionLabel="Try again"
        onAction={retryRestore}
      />
    );
  }

  if (sessionToken && contributorStatus.isLoading) {
    return (
      <AccessRequestStatusCard
        tone="loading"
        title="Loading your access check"
        description="Getting your Google account and access results."
      />
    );
  }

  if (sessionToken && contributorStatus.isError) {
    if (contributorStatusCode === 401 && !contributorSessionRecovered) {
      return (
        <AccessRequestStatusCard
          tone="loading"
          title="Refreshing your session"
          description="Your previous session expired. Getting a new one."
        />
      );
    }

    return (
      <AccessRequestStatusCard
        tone="error"
        title="We could not load this link"
        description="Please refresh the page or ask the agency for a new link."
        actionLabel="Try again"
        onAction={retryRestore}
      />
    );
  }

  if (sessionToken && contributorStatus.data?.contributor?.googleAccountEmail) {
    return <ContributorAccessWizard token={token} sessionToken={sessionToken} />;
  }

  return (
    <AccessRequestIntroCard
      agencyEmail={agencyEmail}
      agencyName={agencyName}
      expiresAt={expiresAt}
      isPreparingSession={!sessionToken || isCreatingVisit}
      onContinue={continueWithGoogle}
      products={products}
    />
  );
}
