"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { useProfileAutofill } from "@/hooks/use-profile-autofill";

type AutofillController = ReturnType<typeof useProfileAutofill>;

export function ProfileAutofillButton({
  onClick,
  disabledReason,
  running,
}: {
  onClick: () => void;
  disabledReason: string | null;
  running: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex"
          tabIndex={disabledReason || running ? 0 : undefined}
          aria-label={
            disabledReason
              ? `Autofill unavailable: ${disabledReason}`
              : undefined
          }
        >
          <Button
            type="button"
            variant="outline"
            disabled={!!disabledReason || running}
            onClick={onClick}
            className="gap-2"
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {running ? "Autofilling…" : "Autofill"}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {disabledReason ??
          "Fill out your saved profile with more details from your website."}
      </TooltipContent>
    </Tooltip>
  );
}

export function ProfileAutofillStatus({
  autofill,
  processing,
  profileError = false,
}: {
  autofill: AutofillController;
  processing: boolean;
  profileError?: boolean;
}) {
  const error =
    autofill.error ??
    (profileError && autofill.phase === "idle"
      ? "Your profile needs attention. Review the details and try Autofill."
      : null);
  if (!error && autofill.phase === "idle" && !processing) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3 text-sm">
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : (
        <p
          role="status"
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" />
          {autofill.phase === "starting"
            ? "Starting Autofill…"
            : autofill.phase === "refreshing"
              ? "Refreshing your profile…"
              : autofill.phase === "processing"
                ? "Autofilling your profile…"
                : "Your profile is processing. Details will refresh when it finishes."}
        </p>
      )}
    </div>
  );
}
