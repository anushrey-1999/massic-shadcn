"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useCustomerAgent } from "@/hooks/use-customer-agent";
import { leadEmails } from "@/lib/customer-agent";
import type { CustomerAgentConfig } from "@/types/customer-agent";
import { Hint } from "../controls";
import { LeadEmailsDialog } from "./LeadEmailsDialog";
import { LeadEmailsRequiredCard } from "./LeadEmailsRequiredCard";
import { LeadsTable } from "./LeadsTable";

interface LeadsTabProps {
  businessId: string;
  config: CustomerAgentConfig;
  saveLeadEmails: ReturnType<typeof useCustomerAgent>["saveLeadEmails"];
}

export function LeadsTab({ businessId, config, saveLeadEmails }: LeadsTabProps) {
  const [emailsOpen, setEmailsOpen] = useState(false);
  const emails = leadEmails(config);
  const openEmails = () => setEmailsOpen(true);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {emails.length === 0 && (
        <div className="shrink-0">
          <LeadEmailsRequiredCard onAdd={openEmails} />
        </div>
      )}
      {/* Fills the space left under the tabs so only the table body scrolls; the tab scrolls only on very short screens. */}
      <div className="flex min-h-[360px] flex-1 flex-col rounded-lg border border-general-border shadow-xs">
        <LeadsTable
          businessId={businessId}
          toolbarActions={
            <Hint label="Lead emails">
              <Button
                type="button"
                variant="outline"
                aria-label="Lead emails"
                className="h-9 w-9 min-w-9 p-0 font-normal"
                onClick={openEmails}
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Hint>
          }
        />
      </div>
      <LeadEmailsDialog
        emails={emails}
        saveLeadEmails={saveLeadEmails}
        open={emailsOpen}
        onOpenChange={setEmailsOpen}
      />
    </div>
  );
}
