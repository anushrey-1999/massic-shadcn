"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
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

export interface SectionToolbarProps {
  label: string;
  top: number;
  left: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onInsertAbove: () => void;
  onInsertBelow: () => void;
}

export function SectionToolbar({
  label,
  top,
  left,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onInsertAbove,
  onInsertBelow,
}: SectionToolbarProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  return (
    <>
      <div
        data-massic-section-editor="true"
        className="absolute z-20 rounded-md border bg-background p-2 shadow-lg"
        style={{ top, left }}
      >
        <div className="space-y-2">
          <Typography className="text-[11px] font-semibold text-muted-foreground px-1">
            {label}
          </Typography>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Move up"
              disabled={isFirst}
              onClick={onMoveUp}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Move down"
              disabled={isLast}
              onClick={onMoveDown}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <div className="mx-0.5 h-4 w-px bg-border" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Duplicate section"
              onClick={onDuplicate}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              title="Delete section"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <div className="mx-0.5 h-4 w-px bg-border" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-1.5 text-[11px]"
              title="Insert block above"
              onClick={onInsertAbove}
            >
              <Plus className="h-3 w-3" />
              Above
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-1.5 text-[11px]"
              title="Insert block below"
              onClick={onInsertBelow}
            >
              <Plus className="h-3 w-3" />
              Below
            </Button>
          </div>
        </div>
      </div>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this section from the page. You can undo with Ctrl+Z.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
