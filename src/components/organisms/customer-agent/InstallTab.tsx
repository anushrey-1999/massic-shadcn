"use client";

import { useId } from "react";
import { KeyRound, Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import type { useCustomerAgent } from "@/hooks/use-customer-agent";
import { installSnippet } from "@/lib/customer-agent";
import type { CustomerAgentConfig } from "@/types/customer-agent";
import { DomainListField } from "./DomainListField";
import { InstallStatusPanel } from "./InstallStatusPanel";
import { PlatformGuides } from "./PlatformGuides";
import { Section } from "./Section";

type CustomerAgentApi = ReturnType<typeof useCustomerAgent>;

interface InstallTabProps {
  businessId: string;
  config: CustomerAgentConfig;
  update: CustomerAgentApi["update"];
  rotateKey: CustomerAgentApi["rotateKey"];
}

export function InstallTab({ businessId, config, update, rotateKey }: InstallTabProps) {
  const switchId = useId();
  const snippet = installSnippet(config.site_key);
  const hasDomains = config.domains.length > 0;
  const savingEnabled = update.isPending && update.variables?.changes.enabled !== undefined;
  const savingDomains = update.isPending && update.variables?.changes.domains !== undefined;

  const saveDomains = async (domains: string[], successMessage: string) => {
    try {
      await update.mutateAsync({ changes: { domains }, successMessage });
      return true;
    } catch {
      return false;
    }
  };

  const toggleEnabled = (enabled: boolean) => {
    update.mutate({
      changes: { enabled },
      successMessage: enabled ? "Customer Agent is live" : "Customer Agent turned off",
    });
  };

  return (
    <div className="flex max-w-[752px] flex-col gap-4 pb-8">
      <Section
        title="Customer Agent"
        description={
          config.enabled
            ? "Live. Visitors on your allowed domains can chat with your agent."
            : hasDomains
              ? "Off. Visitors don't see the chat button."
              : "Add a domain below before turning the agent on."
        }
        action={
          <div className="flex items-center gap-2">
            {savingEnabled && <Loader2 className="size-4 animate-spin text-general-muted-foreground" />}
            <label htmlFor={switchId} className="text-sm text-general-foreground">
              {config.enabled ? "On" : "Off"}
            </label>
            <Switch
              id={switchId}
              checked={config.enabled}
              onCheckedChange={toggleEnabled}
              disabled={update.isPending || (!config.enabled && !hasDomains)}
            />
          </div>
        }
      />

      <Section
        title="Add the snippet"
        description="Paste this before the closing </body> tag on every page, or follow the guide for your platform."
      >
        <div className="space-y-4">
          <CodeSnippet code={snippet} />
          <PlatformGuides snippet={snippet} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-general-border pt-4">
            <p className="text-sm text-general-muted-foreground">
              Site key <code className="font-mono text-xs text-general-foreground">{config.site_key}</code>
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={rotateKey.isPending}>
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
        </div>
      </Section>

      <Section
        title="Allowed domains"
        description="The agent only loads on these sites, which stops others from using your snippet."
      >
        <DomainListField domains={config.domains} onSave={saveDomains} saving={savingDomains} />
      </Section>

      <InstallStatusPanel businessId={businessId} hasDomains={hasDomains} />
    </div>
  );
}
