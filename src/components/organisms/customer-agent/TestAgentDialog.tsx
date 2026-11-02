"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TestAgentFrame, type TestAgentFrameProps } from "./TestAgentFrame";

interface TestAgentDialogProps extends Omit<TestAgentFrameProps, "onClose" | "className"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestAgentDialog({ open, onOpenChange, ...frame }: TestAgentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[620px] max-h-[calc(100vh-2rem)] w-[400px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Test your agent</DialogTitle>
        <DialogDescription className="sr-only">Chat with your agent as a customer would.</DialogDescription>
        {open && <TestAgentFrame {...frame} onClose={() => onOpenChange(false)} className="size-full" />}
      </DialogContent>
    </Dialog>
  );
}
