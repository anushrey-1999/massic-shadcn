"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ExistingBusinessSummary } from "@/lib/business-conflict";

export function MergeBusinessConfirmDialog({
  business,
  pending,
  onCancel,
  onConfirm,
}: {
  business: ExistingBusinessSummary | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={Boolean(business)}
      onOpenChange={(open) => {
        if (!open && !pending) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Merge business?</AlertDialogTitle>
          <AlertDialogDescription>
            {business?.IsPitch
              ? "Existing pitch found. Merge and link it?"
              : "Existing business found. Merge and link it?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <Button onClick={onConfirm} disabled={pending || !business?.UniqueId}>
            {pending ? "Merging…" : "Merge"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
