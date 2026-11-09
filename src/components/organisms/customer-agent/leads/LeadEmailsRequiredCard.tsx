import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeadEmailsRequiredCardProps {
  /** Omitted when the email form is already on screen. */
  onAdd?: () => void;
}

/** Shown after setup when no lead emails are saved, since leads are not emailed until there are some. */
export function LeadEmailsRequiredCard({ onAdd }: LeadEmailsRequiredCardProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Mail className="mt-0.5 size-4 shrink-0 text-amber-800" strokeWidth={1.5} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-900">Add lead emails</p>
          <p className="text-sm text-amber-800">
            New leads aren&apos;t emailed to anyone yet. Add at least one email to get them every 30 minutes.
          </p>
        </div>
      </div>
      {onAdd && (
        <Button size="sm" onClick={onAdd}>
          Add emails
        </Button>
      )}
    </div>
  );
}
