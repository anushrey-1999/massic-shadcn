"use client"

import React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  const handleConfirm = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    onConfirm()
  }, [onConfirm])

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isSending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send this reply to Google?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This will reply only to the selected Google review from {reviewerName}.
              </p>
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-foreground whitespace-pre-wrap break-words">
                {replyText}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reply"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
