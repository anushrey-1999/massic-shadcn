"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ExistingBusinessSummary } from "@/lib/business-conflict";

interface DuplicateBusinessConflictDialogProps {
  open: boolean;
  business: ExistingBusinessSummary | null;
  isConverting?: boolean;
  isReactivating?: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenExisting: () => void;
  onConvertPitch: () => void;
  onReactivate: () => void;
}

export function DuplicateBusinessConflictDialog({
  open,
  business,
  isConverting = false,
  isReactivating = false,
  onOpenChange,
  onOpenExisting,
  onConvertPitch,
  onReactivate,
}: DuplicateBusinessConflictDialogProps) {
  const isPending = isConverting || isReactivating;
  const businessLabel =
    business?.Name?.trim() ||
    business?.Website?.trim() ||
    "this domain";

  const title = business?.IsPitch
    ? "A pitch already exists"
    : business?.IsActive === false
      ? "This business is inactive"
      : "This business already exists";

  const description = business?.IsPitch
    ? business.IsActive
      ? `A pitch for ${businessLabel} already exists. Convert it to a business instead of creating a duplicate. Its existing profile and work will be kept.`
      : `An inactive pitch for ${businessLabel} already exists. Converting it will reactivate it as a business and keep its existing profile and work.`
    : business?.IsActive === false
      ? `${businessLabel} already exists but is inactive. Reactivate it to continue with the existing business.`
      : `${businessLabel} already exists. Open the existing business to continue.`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>

          {business?.IsPitch ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onOpenExisting}
                disabled={isPending}
              >
                Go to pitch
              </Button>
              <Button
                type="button"
                onClick={onConvertPitch}
                disabled={isPending}
              >
                {isConverting ? "Converting..." : "Convert to business"}
              </Button>
            </>
          ) : business?.IsActive === false ? (
            <Button
              type="button"
              onClick={onReactivate}
              disabled={isPending}
            >
              {isReactivating ? "Reactivating..." : "Reactivate & open"}
            </Button>
          ) : (
            <AlertDialogAction asChild>
              <Button
                type="button"
                onClick={onOpenExisting}
                disabled={isPending}
              >
                Go to business
              </Button>
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
