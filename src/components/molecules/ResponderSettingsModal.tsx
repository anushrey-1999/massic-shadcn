"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"

export type ResponderSettingsValue = "all" | "only_4_plus" | "manual"

export interface ResponderSettingsModalValue {
  autoRespond: ResponderSettingsValue
  negativeReviewEmail: string
}

interface ResponderSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value?: Partial<ResponderSettingsModalValue>
  onApply?: (value: ResponderSettingsModalValue) => void
}

export function ResponderSettingsModal({
  open,
  onOpenChange,
  value,
  onApply,
}: ResponderSettingsModalProps) {
  const [autoRespond, setAutoRespond] = React.useState<ResponderSettingsValue>(
    value?.autoRespond ?? "all"
  )
  const [negativeReviewEmail, setNegativeReviewEmail] = React.useState<string>(
    value?.negativeReviewEmail ?? ""
  )

  React.useEffect(() => {
    if (!open) return
    setAutoRespond(value?.autoRespond ?? "all")
    setNegativeReviewEmail(value?.negativeReviewEmail ?? "")
  }, [open, value?.autoRespond, value?.negativeReviewEmail])

  const handleCancel = React.useCallback(() => onOpenChange(false), [onOpenChange])

  const handleApply = React.useCallback(() => {
    onApply?.({ autoRespond, negativeReviewEmail })
    onOpenChange(false)
  }, [autoRespond, negativeReviewEmail, onApply, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-[760px] gap-0">
        <DialogHeader className="px-4 py-4">
          <DialogTitle className="text-[20px] font-semibold tracking-[-0.4px] text-general-foreground">
            Responder Settings
          </DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="px-4 py-4 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-general-foreground">
              Automatically Respond to the Following Reviews
            </div>

            <RadioGroup
              value={autoRespond}
              onValueChange={(v) => setAutoRespond(v as ResponderSettingsValue)}
              className="flex flex-wrap gap-8"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="reviews-auto-all" value="all" className="cursor-pointer" />
                <Label
                  htmlFor="reviews-auto-all"
                  className="text-sm font-normal text-[#404040] cursor-pointer"
                >
                  All
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <RadioGroupItem id="reviews-auto-4plus" value="only_4_plus" className="cursor-pointer" />
                <Label
                  htmlFor="reviews-auto-4plus"
                  className="text-sm font-normal text-[#404040] cursor-pointer"
                >
                  Only 4.0 and above
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <RadioGroupItem id="reviews-auto-manual" value="manual" className="cursor-pointer" />
                <Label
                  htmlFor="reviews-auto-manual"
                  className="text-sm font-normal text-[#404040] cursor-pointer"
                >
                  None. Manually Approve Each Response
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="flex flex-col gap-2 max-w-[380px] w-full">
            <div className="text-sm font-medium text-general-foreground">
              Contact Information for Negative Reviews
            </div>
            <Input
              placeholder="Enter your e-mail address"
              value={negativeReviewEmail}
              onChange={(e) => setNegativeReviewEmail(e.target.value)}
            />
            <p className="text-[10px] leading-normal tracking-[0.15px] text-general-muted-foreground">
              This information will be shared in responses to negative reviews so that customers
              can reach out with complaints and for resolutions.
            </p>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={handleCancel} type="button">
              Cancel
            </Button>
            <Button onClick={handleApply} type="button">
              Apply Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

