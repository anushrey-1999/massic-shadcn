"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Loader2 } from "lucide-react"
import {
  useLocationResponderSettings,
  useUpdateReviewResponderSettings,
  uiToApiResponseMode,
  apiToUiResponseMode,
  type UiResponseMode,
} from "@/hooks/use-review-responder-settings"

export type ResponderSettingsValue = UiResponseMode

export interface ResponderSettingsModalValue {
  autoRespond: ResponderSettingsValue
  negativeReviewEmail: string
}

interface ResponderSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string | null
  userUniqueId: string | null
  locationId: string | null
}

export function ResponderSettingsModal({
  open,
  onOpenChange,
  businessId,
  userUniqueId,
  locationId,
}: ResponderSettingsModalProps) {
  const [autoRespond, setAutoRespond] = React.useState<ResponderSettingsValue>("manual")
  const [negativeReviewEmail, setNegativeReviewEmail] = React.useState<string>("")

  const { settings, isLoading: isLoadingSettings, refetch } = useLocationResponderSettings(
    businessId,
    userUniqueId,
    locationId
  )

  const updateMutation = useUpdateReviewResponderSettings()

  // Reset form and refetch when modal opens
  React.useEffect(() => {
    if (open && refetch) {
      // Refetch latest data from server
      refetch()
      
      // Reset to defaults immediately while loading
      setAutoRespond("manual")
      setNegativeReviewEmail("")
    }
  }, [open, refetch])

  // Prefill form with fetched settings
  React.useEffect(() => {
    if (!open || !settings) return
    
    setAutoRespond(apiToUiResponseMode(settings.ResponseMode))
    setNegativeReviewEmail(settings.NegativeReviewContactEmail || "")
  }, [open, settings])

  const handleCancel = React.useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const handleApply = React.useCallback(async () => {
    if (!businessId || !userUniqueId || !locationId) {
      return
    }

    await updateMutation.mutateAsync({
      businessUniqueId: businessId,
      userUniqueId: userUniqueId,
      locationId: locationId,
      settings: {
        ResponseMode: uiToApiResponseMode(autoRespond),
        NegativeReviewContactEmail: negativeReviewEmail.trim(),
      },
    })

    onOpenChange(false)
  }, [businessId, userUniqueId, locationId, autoRespond, negativeReviewEmail, updateMutation, onOpenChange])

  const isLoading = isLoadingSettings || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-[760px] gap-0">
        <DialogHeader className="px-4 py-4">
          <DialogTitle className="text-[20px] font-semibold tracking-[-0.4px] text-general-foreground">
            Responder Settings
          </DialogTitle>
        </DialogHeader>

        <Separator />

        {isLoadingSettings ? (
          <div className="px-4 py-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="px-4 py-4 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium text-general-foreground">
                  Automatically Respond to the Following Reviews
                </div>

                <RadioGroup
                  value={autoRespond}
                  onValueChange={(v) => setAutoRespond(v as ResponderSettingsValue)}
                  className="flex flex-wrap gap-8"
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="reviews-auto-all" value="all" className="cursor-pointer" disabled={isLoading} />
                    <Label
                      htmlFor="reviews-auto-all"
                      className="text-sm font-normal text-[#404040] cursor-pointer"
                    >
                      All
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="reviews-auto-4plus" value="only_4_plus" className="cursor-pointer" disabled={isLoading} />
                    <Label
                      htmlFor="reviews-auto-4plus"
                      className="text-sm font-normal text-[#404040] cursor-pointer"
                    >
                      Only 4.0 and above
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="reviews-auto-manual" value="manual" className="cursor-pointer" disabled={isLoading} />
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
                  disabled={isLoading}
                />
                <p className="text-[10px] leading-normal tracking-[0.15px] text-general-muted-foreground">
                  This information will be shared in responses to negative reviews so that customers
                  can reach out with complaints and for resolutions.
                </p>
              </div>
            </div>

            <div className="px-4 py-4">
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={handleCancel} type="button" disabled={isLoading}>
                  Cancel
                </Button>
                <Button onClick={handleApply} type="button" disabled={isLoading || !locationId}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Apply Changes"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

