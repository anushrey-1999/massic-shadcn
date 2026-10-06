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

export type ProfileConfirmAction = "save" | "create" | "autofill";

const COPY: Record<ProfileConfirmAction, { title: string; description: string }> = {
  save: {
    title: "Save Changes",
    description: "Your profile changes will be saved. Do you want to continue?",
  },
  create: {
    title: "Create Business",
    description: "This will create the business with the profile details below. Do you want to continue?",
  },
  autofill: {
    title: "Autofill Profile",
    description:
      "Autofill will rebuild the profile from the website and may overwrite the current details. Do you want to continue?",
  },
};

interface ProfileActionConfirmDialogProps {
  action: ProfileConfirmAction | null;
  onCancel: () => void;
  onConfirm: (action: ProfileConfirmAction) => void;
}

export function ProfileActionConfirmDialog({
  action,
  onCancel,
  onConfirm,
}: ProfileActionConfirmDialogProps) {
  const copy = action ? COPY[action] : null;

  return (
    <AlertDialog
      open={action !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (action) onConfirm(action);
            }}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
