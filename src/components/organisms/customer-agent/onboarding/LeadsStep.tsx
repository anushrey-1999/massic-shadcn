"use client";

import { ArrowRight, Clock, FileSpreadsheet, Loader2, Mail, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useCustomerAgent } from "@/hooks/use-customer-agent";
import { leadEmails } from "@/lib/customer-agent";
import type { CustomerAgentConfig } from "@/types/customer-agent";
import { Hint } from "../controls";
import { LeadEmailsField, useLeadEmailsDraft } from "../leads/LeadEmailsField";
import { StepFooter, StepLayout } from "./StepLayout";

const HOW_IT_WORKS: readonly { icon: LucideIcon; text: string }[] = [
  { icon: Mail, text: "When a visitor leaves their details, your agent saves them as a lead." },
  { icon: Clock, text: "Every 30 minutes, new leads are emailed to everyone on this list." },
  { icon: FileSpreadsheet, text: "Each email lists the leads and attaches a CSV file you can open in a spreadsheet." },
];

interface LeadsStepProps {
  config: CustomerAgentConfig;
  saveLeadEmails: ReturnType<typeof useCustomerAgent>["saveLeadEmails"];
  onBack: () => void;
  onContinue: () => void;
}

export function LeadsStep({ config, saveLeadEmails, onBack, onContinue }: LeadsStepProps) {
  const draft = useLeadEmailsDraft(leadEmails(config), saveLeadEmails);
  const hasSaved = leadEmails(config).length > 0;
  const canContinue = draft.isValid && !draft.isSaving;
  const hint = draft.isValid ? undefined : "Add at least one email to continue";

  const handleContinue = () => {
    if (draft.isDirty) draft.save(onContinue);
    else if (hasSaved) onContinue();
  };

  return (
    <StepLayout
      title="Lead emails"
      line="Where your agent sends the leads it captures."
      footer={
        <StepFooter onBack={onBack}>
          <Hint label={hint} disabled>
            <Button onClick={handleContinue} disabled={!canContinue}>
              {draft.isSaving && <Loader2 className="size-4 animate-spin" />}
              {draft.isSaving ? "Saving…" : draft.isDirty ? "Save and continue" : "Continue"}
              {!draft.isSaving && <ArrowRight className="size-4" />}
            </Button>
          </Hint>
        </StepFooter>
      }
    >
      <form
        className="min-h-0 flex-1 overflow-auto"
        onSubmit={(event) => {
          event.preventDefault();
          if (canContinue) handleContinue();
        }}
      >
        <div className="max-w-[560px] space-y-6">
          <LeadEmailsField draft={draft} />
          <ul className="space-y-3 rounded-lg border border-general-border bg-white p-4 shadow-xs">
            {HOW_IT_WORKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-general-muted-foreground">
                <Icon className="mt-0.5 size-4 shrink-0 text-general-foreground" strokeWidth={1.5} />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </form>
    </StepLayout>
  );
}
