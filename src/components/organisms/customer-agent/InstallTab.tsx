"use client";

import { useId, useMemo } from "react";
import { ChevronDown, KeyRound, Loader2 } from "lucide-react";
import { CodeSnippet } from "@/components/molecules/CodeSnippet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { useCustomerAgentInstallStatus, type useCustomerAgent } from "@/hooks/use-customer-agent";
import { installSnippet, pickAppearance, previewConfig } from "@/lib/customer-agent";
import { cn } from "@/lib/utils";
import type { CustomerAgentConfig } from "@/types/customer-agent";
import { SECONDARY_BUTTON_CLASS } from "./controls";
import { DomainListField } from "./DomainListField";
import { InstallStatusPanel } from "./InstallStatusPanel";
import { PlatformGuides } from "./PlatformGuides";
import { PreviewPanel } from "./PreviewPanel";
import { Section } from "./Section";
import { SetupStep } from "./SetupStep";

type CustomerAgentApi = ReturnType<typeof useCustomerAgent>;

interface InstallTabProps {
  businessId: string;
  config: CustomerAgentConfig;
  update: CustomerAgentApi["update"];
  rotateKey: CustomerAgentApi["rotateKey"];
}

function StatusPill({ live }: { live: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-sm px-2 text-xs font-medium",
        live ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", live ? "bg-green-500" : "bg-gray-400")} />
      {live ? "Live" : "Off"}
    </span>
  );
}

export function InstallTab({ businessId, config, update, rotateKey }: InstallTabProps) {
  const switchId = useId();
  const snippet = installSnippet(config.site_key);
  const hasDomains = config.domains.length > 0;
  const status = useCustomerAgentInstallStatus(businessId, hasDomains);
  const codeFound = hasDomains && (status.data?.installs.length ?? 0) > 0;
  const savingEnabled = update.isPending && update.variables?.changes.enabled !== undefined;
  const widgetConfig = useMemo(() => previewConfig(config, pickAppearance(config)), [config]);

  const saveDomains = async (domains: string[], successMessage: string) => {
    try {
      await update.mutateAsync({ changes: { domains }, successMessage });
      return true;
    } catch {
      return false;
    }
  };

  const toggleEnabled = (enabled: boolean) => {
    if (update.isPending) return;
    update.mutate({
      changes: { enabled },
      successMessage: enabled ? "Customer Agent is live" : "Customer Agent turned off",
    });
  };

  return (
    <div className="flex gap-6 pb-8">
      <div className="flex min-w-0 max-w-[640px] flex-1 flex-col">
        <Section
          title="Set up your agent"
          action={<StatusPill live={config.enabled} />}
        >
          <ol>
            <SetupStep
              index={1}
              done={hasDomains}
              title="Add your website"
            >
              <DomainListField
                domains={config.domains}
                suggestedWebsite={config.business.website}
                onSave={saveDomains}
                saving={update.isPending}
              />
            </SetupStep>

            <SetupStep
              index={2}
              done={codeFound}
              title="Paste this code before </body>"
            >
              <CodeSnippet code={snippet} />
              <PlatformGuides snippet={snippet} />
            </SetupStep>

            <SetupStep index={3} done={config.enabled && hasDomains} title="Go live" last>
              <div className="divide-y divide-general-border rounded-lg border border-general-border px-3">
                <InstallStatusPanel status={status} hasDomains={hasDomains} />
                <div className="flex min-h-10 items-center justify-between gap-3">
                  <label htmlFor={switchId} className="text-sm text-general-foreground">
                    Show the chat on your website
                    {!hasDomains && !config.enabled && (
                      <span className="block text-xs text-general-muted-foreground">Add your website first.</span>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    {savingEnabled && <Loader2 className="size-4 animate-spin text-general-muted-foreground" />}
                    <Switch
                      id={switchId}
                      checked={config.enabled}
                      onCheckedChange={toggleEnabled}
                      disabled={update.isPending || (!config.enabled && !hasDomains)}
                    />
                  </div>
                </div>
              </div>
            </SetupStep>
          </ol>

          <Collapsible className="mt-3 border-t border-general-border pt-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="group -ml-2 text-general-muted-foreground">
                Advanced
                <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-general-muted-foreground">
                  Site key <code className="font-mono text-xs text-general-foreground">{config.site_key}</code>
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className={SECONDARY_BUTTON_CLASS} disabled={rotateKey.isPending}>
                      {rotateKey.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <KeyRound className="size-4" />
                      )}
                      Rotate key
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-medium">Rotate the site key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The current snippet stops working right away. The agent stays hidden until you
                        replace the snippet on your website with the new one.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => rotateKey.mutate()}>Rotate key</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Section>
      </div>

      <PreviewPanel businessId={businessId} config={widgetConfig} pageUrl={config.domains[0] ?? "https://example.com"} />
    </div>
  );
}
