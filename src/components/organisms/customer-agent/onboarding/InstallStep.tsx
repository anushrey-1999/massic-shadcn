"use client";

import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVisitorAgentInstall } from "@/hooks/use-customer-agent";
import { installSnippet } from "@/lib/customer-agent";
import type { CustomerAgentConfig } from "@/types/customer-agent";
import { SECONDARY_BUTTON_CLASS } from "../controls";
import { InstallPanel } from "../InstallPanel";
import { requestError } from "../request-error";
import { StepFooter, StepLayout } from "./StepLayout";

interface InstallStepProps {
  businessId: string;
  config: CustomerAgentConfig;
  finishing: boolean;
  onRefreshInstallation: () => void;
  onBack: () => void;
  onFinish: () => void;
}

export function InstallStep({
  businessId,
  config,
  finishing,
  onRefreshInstallation,
  onBack,
  onFinish,
}: InstallStepProps) {
  const install = useVisitorAgentInstall(businessId);
  const siteKey = install.siteKey.data;
  const connected = Boolean(config.install.last_seen_at);

  const body = () => {
    if (install.siteKey.isLoading) {
      return (
        <p role="status" className="flex items-center gap-2 text-sm text-general-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Preparing your code…
        </p>
      );
    }
    if (!siteKey) {
      return (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-general-muted-foreground">
            {install.siteKey.isError ? requestError(install.siteKey.error) : "Turn on your customer agent to get the code."}
          </p>
          {install.siteKey.isError && (
            <Button variant="outline" size="sm" onClick={() => void install.siteKey.refetch()}>
              Try again
            </Button>
          )}
        </div>
      );
    }
    return (
      <InstallPanel
        businessId={businessId}
        siteKey={siteKey}
        install={config.install}
        snippet={installSnippet(config.site_id, siteKey.key)}
        onRefreshInstallation={onRefreshInstallation}
      />
    );
  };

  return (
    <StepLayout
      title="Add to your website"
      line="Paste the code once and your agent shows on every page."
      footer={
        <StepFooter onBack={onBack}>
          <Button
            variant={connected ? "default" : "outline"}
            className={connected ? undefined : SECONDARY_BUTTON_CLASS}
            disabled={finishing}
            onClick={onFinish}
          >
            {finishing ? <Loader2 className="size-4 animate-spin" /> : connected && <Check className="size-4" />}
            {connected ? "Finish" : "Install later"}
          </Button>
        </StepFooter>
      }
    >
      <div className="min-h-0 max-w-[752px] flex-1 overflow-auto">{body()}</div>
    </StepLayout>
  );
}
