"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface BasicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  primaryButtonLabel: string;
  primaryButtonOnClick: () => void;
  primaryButtonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  primaryButtonIcon?: LucideIcon;
  primaryButtonDisabled?: boolean;
  primaryButtonClassName?: string;
  cancelButtonLabel?: string;
  maxWidth?: string;
  showCloseButton?: boolean;
  className?: string;
}

export const BasicModal: React.FC<BasicModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  primaryButtonLabel,
  primaryButtonOnClick,
  primaryButtonVariant = "default",
  primaryButtonIcon,
  primaryButtonDisabled = false,
  primaryButtonClassName,
  cancelButtonLabel = "Cancel",
  maxWidth = "sm:max-w-[480px]",
  showCloseButton = false,
  className,
}) => {
  const PrimaryIcon = primaryButtonIcon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(maxWidth, "p-8", className)}
        showCloseButton={showCloseButton}
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-general-foreground">{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {cancelButtonLabel}
          </Button>
          <Button
            variant={primaryButtonVariant}
            onClick={primaryButtonOnClick}
            className={cn("flex items-center gap-2", primaryButtonClassName)}
            disabled={primaryButtonDisabled}
          >
            {PrimaryIcon && <PrimaryIcon className="size-4" />}
            {primaryButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
