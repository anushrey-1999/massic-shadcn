"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface SendReviewReplyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  reviewerName: string
  replyText: string
  isSending?: boolean
}

export function SendReviewReplyDialog({
  open,
  onOpenChange,
  onConfirm,
  reviewerName,
  replyText,
  isSending = false,
}: SendReviewReplyDialogProps) {
  const handleConfirm = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      onConfirm()
    },
    [onConfirm]
  )

  return (
    <Dialog open={open} onOpenChange={(next) => !isSending && onOpenChange(next)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Send this reply</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p>
                This will reply only to the selected Google review from{" "}
                {reviewerName}.
              </p>
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-foreground whitespace-pre-wrap break-words">
                {replyText}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Respond"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
