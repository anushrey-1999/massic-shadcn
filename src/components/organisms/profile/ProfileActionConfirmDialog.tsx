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

export type ProfileConfirmAction =
  | "save"
  | "create-pitch";

const COPY: Record<ProfileConfirmAction, { title: string; description: string }> = {
  save: {
    title: "Save Changes",
    description: "Your profile changes will be saved. Do you want to continue?",
  },
  "create-pitch": {
    title: "Create Pitch",
    description:
      "This will create the pitch with the website and location details below. Do you want to continue?",
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
