"use client";

import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { useCustomerAgent } from "@/hooks/use-customer-agent";
import { SECONDARY_BUTTON_CLASS } from "../controls";
import { LeadEmailsField, useLeadEmailsDraft } from "./LeadEmailsField";

type SaveLeadEmails = ReturnType<typeof useCustomerAgent>["saveLeadEmails"];

interface LeadEmailsDialogProps {
  emails: string[];
  saveLeadEmails: SaveLeadEmails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The draft lives inside the dialog content, so closing without saving discards it. */
function LeadEmailsForm({
  emails,
  saveLeadEmails,
  onClose,
}: Omit<LeadEmailsDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const draft = useLeadEmailsDraft(emails, saveLeadEmails);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    draft.save(onClose);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <LeadEmailsField draft={draft} />
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className={SECONDARY_BUTTON_CLASS}
          onClick={onClose}
          disabled={draft.isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!draft.isDirty || !draft.isValid || draft.isSaving}>
          {draft.isSaving && <Loader2 className="size-4 animate-spin" />}
          {draft.isSaving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function LeadEmailsDialog({ emails, saveLeadEmails, open, onOpenChange }: LeadEmailsDialogProps) {
  const close = () => onOpenChange(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && saveLeadEmails.isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="grid-cols-1 sm:max-w-lg">
        <DialogHeader className="pr-6">
          <DialogTitle className="font-medium">Lead emails</DialogTitle>
          <DialogDescription>
            New leads are emailed here every 30 minutes, with a CSV file of their details.
          </DialogDescription>
        </DialogHeader>
        <LeadEmailsForm emails={emails} saveLeadEmails={saveLeadEmails} onClose={close} />
      </DialogContent>
    </Dialog>
  );
}
