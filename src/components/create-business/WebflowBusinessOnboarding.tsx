"use client";

import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfileGateCard } from "@/components/templates/ProfileGateCard";
import { PlatformIcon } from "@/components/organisms/WebChannels/platform-icon";
import { CreateBusinessGateLayout } from "./CreateBusinessGateLayout";
import {
  useStartWebflowOnboarding,
  useWebflowOnboardingDomains,
  useWebflowOnboardingSites,
  type WebflowOnboardingSelection,
} from "@/hooks/use-webflow-onboarding";

type OAuthMessage = {
  source?: string;
  ok?: boolean;
  onboarding?: boolean;
  sessionId?: string;
  message?: string;
};

function InlineError({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive sm:flex-row sm:items-center sm:justify-between">
      <span>{message}</span>
      {action}
    </div>
  );
}

export function WebflowBusinessOnboarding({
  sessionId,
  initialOauthError,
  onSessionId,
  onContinue,
  onBack,
}: {
  sessionId: string | null;
  initialOauthError?: string | null;
  onSessionId: (sessionId: string | null) => void;
  onContinue: (selection: WebflowOnboardingSelection) => void;
  onBack: () => void;
}) {
  const startOauth = useStartWebflowOnboarding();
  const sitesQuery = useWebflowOnboardingSites(sessionId);
  const [selectedSiteId, setSelectedSiteId] = React.useState("");
  const [selectedDomain, setSelectedDomain] = React.useState("");
  const [oauthError, setOauthError] = React.useState<string | null>(
    initialOauthError || null,
  );
  const popupRef = React.useRef<Window | null>(null);
  const oauthCompletedRef = React.useRef(false);

  const domainsQuery = useWebflowOnboardingDomains(
    sessionId,
    selectedSiteId || null,
  );
  React.useEffect(() => {
    if (sitesQuery.data?.length === 1 && !selectedSiteId) {
      setSelectedSiteId(sitesQuery.data[0].id);
    }
  }, [selectedSiteId, sitesQuery.data]);

  React.useEffect(() => {
    setSelectedDomain("");
  }, [selectedSiteId]);

  React.useEffect(() => {
    const onOauthMessage = (event: MessageEvent<OAuthMessage>) => {
      const payload = event.data;
      if (
        !payload ||
        payload.source !== "massic-webflow-oauth" ||
        payload.onboarding !== true
      )
        return;

      oauthCompletedRef.current = true;
      if (payload.ok && payload.sessionId) {
        setOauthError(null);
        setSelectedSiteId("");
        setSelectedDomain("");
        onSessionId(payload.sessionId);
        return;
      }
      setOauthError(
        payload.message ||
          "Webflow authorization did not complete. Please try again.",
      );
    };
    window.addEventListener("message", onOauthMessage);
    return () => window.removeEventListener("message", onOauthMessage);
  }, [onSessionId]);

  const siteOptions = domainsQuery.data;
  const derivedUrl = siteOptions?.resolvedUrl || selectedDomain || "";
  const selectedSite =
    sitesQuery.data?.find((site) => site.id === selectedSiteId) || null;
  const canContinue = Boolean(
    sessionId && selectedSiteId && derivedUrl && !domainsQuery.isLoading,
  );

  const connectWebflow = async () => {
    setOauthError(null);
    oauthCompletedRef.current = false;
    const popup = window.open("about:blank", "_blank");
    popupRef.current = popup;
    if (popup) {
      try {
        popup.document.title = "Connecting Webflow";
        popup.document.body.innerHTML =
          '<p style="font-family: system-ui, sans-serif; padding: 24px;">Opening Webflow authorization...</p>';
      } catch {
        // Browser restrictions can prevent access to the temporary window.
      }
    }

    try {
      const { authorizationUrl } = await startOauth.mutateAsync();
      if (!popup || popup.closed) {
        window.location.assign(authorizationUrl);
        return;
      }
      popup.location.replace(authorizationUrl);
      popup.focus();

      const popupClosedTimer = window.setInterval(() => {
        if (!popup.closed) return;
        window.clearInterval(popupClosedTimer);
        if (!oauthCompletedRef.current) {
          setOauthError(
            "The Webflow authorization window was closed before connecting.",
          );
        }
      }, 500);
    } catch (error: any) {
      popup?.close();
      setOauthError(error?.message || "Could not start Webflow authorization.");
    }
  };

  const continueToBusinessDetails = () => {
    if (!canContinue || !sessionId) return;
    onContinue({
      sessionId,
      siteId: selectedSiteId,
      selectedDomain: selectedDomain || null,
      website: derivedUrl,
    });
  };

  return (
    <CreateBusinessGateLayout className="items-start py-8 sm:items-center sm:py-5">
      <ProfileGateCard
        title="Connect your Webflow site"
        description="Massic gets your website directly from the sites you authorize in Webflow."
        className="w-full max-w-[600px]"
      >
        <div className="mb-6 grid grid-cols-3 gap-2 text-[11px] text-general-muted-foreground">
          {["Connect", "Choose site", "Business details"].map(
            (label, index) => {
              const completed = index === 0 && Boolean(sessionId);
              const current =
                index === 0
                  ? !sessionId
                  : index === 1
                    ? Boolean(sessionId)
                    : Boolean(derivedUrl);
              return (
                <div key={label} className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${completed ? "border-general-foreground bg-general-foreground text-general-primary-foreground" : current ? "border-general-foreground text-general-foreground" : "border-general-border-three"}`}
                    >
                      {completed ? <Check className="size-3" /> : index + 1}
                    </span>
                    <span className="truncate">{label}</span>
                  </div>
                  <div
                    className={`h-px ${completed || current ? "bg-general-foreground" : "bg-general-border"}`}
                  />
                </div>
              );
            },
          )}
        </div>

        {!sessionId ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-general-border bg-general-primary-foreground p-4">
              <PlatformIcon platform="webflow" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-general-foreground">
                  Authorize Massic in Webflow
                </p>
                <p className="mt-1 text-xs leading-5 text-general-muted-foreground">
                  You will choose which Webflow sites Massic can access. We use
                  that connection for site selection and publishing.
                </p>
              </div>
            </div>
            {oauthError ? <InlineError message={oauthError} /> : null}
            <Button
              type="button"
              onClick={connectWebflow}
              disabled={startOauth.isPending}
              className="w-full gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
            >
              {startOauth.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect Webflow
                  <ExternalLink className="size-4" />
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {sitesQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-general-border p-6 text-xs text-general-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading authorized sites...
              </div>
            ) : sitesQuery.isError ? (
              <InlineError
                message={sitesQuery.error.message}
                action={
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => sitesQuery.refetch()}
                    >
                      <RefreshCw className="size-3" />
                      Retry
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onSessionId(null)}
                    >
                      Reconnect
                    </Button>
                  </div>
                }
              />
            ) : sitesQuery.data?.length === 0 ? (
              <InlineError
                message="No authorized Webflow sites were found. Check your Webflow permissions and reconnect."
                action={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onSessionId(null)}
                  >
                    Reconnect
                  </Button>
                }
              />
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-general-foreground">
                    Webflow site
                  </label>
                  <Select
                    value={selectedSiteId}
                    onValueChange={setSelectedSiteId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an authorized site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sitesQuery.data?.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSite ? (
                    <p className="text-xs text-general-muted-foreground">
                      Authorized through Webflow OAuth:{" "}
                      {selectedSite.displayName}
                    </p>
                  ) : null}
                </div>

                {selectedSiteId && domainsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-general-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Checking site domains...
                  </div>
                ) : null}
                {domainsQuery.isError ? (
                  <InlineError
                    message={domainsQuery.error.message}
                    action={
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => domainsQuery.refetch()}
                      >
                        <RefreshCw className="size-3" />
                        Retry
                      </Button>
                    }
                  />
                ) : null}

                {siteOptions?.requiresDomainSelection ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-general-foreground">
                      Website domain
                    </label>
                    <Select
                      value={selectedDomain}
                      onValueChange={setSelectedDomain}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select the primary business domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {siteOptions.domains.map((domain) => (
                          <SelectItem key={domain.url} value={domain.url}>
                            {domain.url.replace(/^https?:\/\//, "")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {derivedUrl ? (
                  <div className="space-y-2">
                    <label
                      htmlFor="webflow-derived-url"
                      className="text-xs font-medium text-general-foreground"
                    >
                      Website from Webflow
                    </label>
                    <input
                      id="webflow-derived-url"
                      value={derivedUrl}
                      readOnly
                      className="h-10 w-full rounded-lg border border-general-border-three bg-general-secondary px-3 text-sm text-general-foreground shadow-xs outline-none"
                    />
                    <p className="text-xs text-general-muted-foreground">
                      This URL comes from the authorized Webflow API connection
                      and cannot be edited here.
                    </p>
                  </div>
                ) : null}
              </>
            )}

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={onBack}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={continueToBusinessDetails}
                disabled={!canContinue}
                className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
              >
                Continue to business details
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {!sessionId ? (
          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
            Choose another platform
          </Button>
        ) : null}
      </ProfileGateCard>
    </CreateBusinessGateLayout>
  );
}
