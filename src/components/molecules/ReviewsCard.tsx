"use client"

import React from "react"
import { Star, X, SendHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"
import { SendReviewReplyDialog } from "@/components/molecules/SendReviewReplyDialog"

export interface ReviewsCardProps {
  reviewId: string
  businessId: string
  title: string
  reviewText: string
  rating: number
  reviewerImageSrc?: string
  generatedResponse?: string | null
  editedResponse?: string | null
  existingReply?: string | null
  replySource?: string | null
  isIgnored?: boolean
  isIgnoring?: boolean
  isSending?: boolean
  onIgnore?: () => void
  onSend?: (response: string) => Promise<unknown> | unknown
  onAutoSave?: (payload: { businessId: string; reviewId: string; updatedResponse: string }) => Promise<unknown>
}

function RatingStars({ value }: { value: number }) {
  const rounded = Math.round(value)

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, idx) => {
        const active = idx < rounded
        return (
          <Star
            key={idx}
            className={cn(
              "h-3 w-3",
              active ? "text-amber-500 fill-amber-500" : "text-amber-200 fill-amber-200"
            )}
          />
        )
      })}
    </div>
  )
}

export function ReviewsCard({
  reviewId,
  businessId,
  title,
  reviewText,
  rating,
  reviewerImageSrc,
  generatedResponse,
  editedResponse,
  existingReply,
  replySource,
  isIgnored = false, isIgnoring = false, isSending = false, onIgnore,
  onSend,
  onAutoSave,
}: ReviewsCardProps) {
  const persistedResponse = editedResponse ?? generatedResponse ?? ""
  const [response, setResponse] = React.useState(persistedResponse)
  const [lastSavedResponse, setLastSavedResponse] = React.useState(persistedResponse)
  const [imageError, setImageError] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [showSavedState, setShowSavedState] = React.useState(false)
  const [sendDialogOpen, setSendDialogOpen] = React.useState(false)
  const previousReviewIdRef = React.useRef(reviewId)
  const responseRef = React.useRef(response)
  const lastSavedResponseRef = React.useRef(lastSavedResponse)
  const latestSaveRequestRef = React.useRef(0)
  const previousPersistedResponseRef = React.useRef(persistedResponse)
  const debouncedResponse = useDebounce(response, 800)

  React.useEffect(() => {
    responseRef.current = response
  }, [response])

  React.useEffect(() => {
    lastSavedResponseRef.current = lastSavedResponse
  }, [lastSavedResponse])

  const autoSave = React.useEffectEvent(async (nextResponse: string) => {
    if (!onAutoSave) return

    const requestId = latestSaveRequestRef.current + 1
    latestSaveRequestRef.current = requestId
    setIsSaving(true)

    try {
      await onAutoSave({
        businessId,
        reviewId,
        updatedResponse: nextResponse,
      })

      if (latestSaveRequestRef.current === requestId) {
        setLastSavedResponse(nextResponse)
        setShowSavedState(true)
      }
    } finally {
      if (latestSaveRequestRef.current === requestId) {
        setIsSaving(false)
      }
    }
  })

  const hasReply = Boolean(existingReply && existingReply.trim())
  const shouldShowResponseBox = hasReply || (!isIgnored && !hasReply)

  React.useEffect(() => {
    const isReviewChanged = previousReviewIdRef.current !== reviewId
    previousReviewIdRef.current = reviewId

    if (isReviewChanged) {
      setResponse(persistedResponse)
      setLastSavedResponse(persistedResponse)
      setIsSaving(false)
      setShowSavedState(false)
      latestSaveRequestRef.current = 0
      previousPersistedResponseRef.current = persistedResponse
      return
    }

    const hasUnsavedLocalChanges = responseRef.current !== lastSavedResponseRef.current
    const persistedResponseChanged = previousPersistedResponseRef.current !== persistedResponse
    previousPersistedResponseRef.current = persistedResponse

    setLastSavedResponse((currentResponse) =>
      currentResponse === persistedResponse ? currentResponse : persistedResponse
    )

    if (!hasUnsavedLocalChanges) {
      setResponse((currentResponse) =>
        currentResponse === persistedResponse ? currentResponse : persistedResponse
      )
    }

    if (persistedResponseChanged) {
      setShowSavedState(false)
    }
  }, [persistedResponse, reviewId])

  React.useEffect(() => {
    if (!showSavedState) return

    const timeoutId = window.setTimeout(() => {
      setShowSavedState(false)
    }, 1500)

    return () => window.clearTimeout(timeoutId)
  }, [showSavedState])

  const optimizedImageSrc = React.useMemo(() => {
    if (!reviewerImageSrc || imageError) return null

    try {
      const url = new URL(reviewerImageSrc)
      // Add Google CDN size parameters to reduce bandwidth
      if (url.hostname.includes('googleusercontent.com') || url.hostname.includes('ggpht.com')) {
        url.searchParams.set('sz', '48') // Request 48x48 size (2x for retina)
      }
      return url.toString()
    } catch {
      return reviewerImageSrc
    }
  }, [reviewerImageSrc, imageError])

  React.useEffect(() => {
    if (!onAutoSave || hasReply || isIgnored) return
    if (debouncedResponse === lastSavedResponse) return

    setShowSavedState(false)
    autoSave(debouncedResponse).catch(() => {
      // Keep local text intact; user can continue editing and debounce will retry on next change.
      setIsSaving(false)
    })
  }, [debouncedResponse, hasReply, isIgnored, lastSavedResponse, onAutoSave])

  const handleSendClick = React.useCallback(() => {
    if (!response.trim()) return
    setSendDialogOpen(true)
  }, [response])

  const handleSendConfirm = React.useCallback(async () => {
    if (!onSend) return

    await onSend(response)
    setSendDialogOpen(false)
  }, [onSend, response])

  return (
    <>
      <div className="w-full bg-secondary rounded-lg p-4 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 font-mono text-base text-general-foreground leading-normal">
              {title}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="h-6 w-6 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                {optimizedImageSrc && !imageError ? (
                  <img
                    src={optimizedImageSrc}
                    alt=""
                    loading="lazy"
                    onError={() => setImageError(true)}
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  <div className="h-full w-full rounded-full flex items-center justify-center text-[10px] font-medium text-gray-600 bg-gray-200">
                    {title.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-general-foreground">
                  {rating.toFixed(1)}
                </span>
                <RatingStars value={rating} />
              </div>
            </div>
          </div>

          <p className="text-xs text-general-muted-foreground leading-normal tracking-[0.18px]">
            {reviewText}
          </p>
        </div>

        {shouldShowResponseBox && (
          <div className="flex items-start gap-3 w-full">
            <div className="flex-1 bg-white rounded-lg p-2">
              <div className="text-xs text-general-muted-foreground pb-2">
                {hasReply ? "Reply" : "Generated Response"}
              </div>

              {hasReply ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-medium text-general-foreground tracking-[0.07px]">
                    {existingReply}
                  </p>
                  {replySource === "manual_massic" ? (
                    <p className="text-[11px] text-general-muted-foreground">
                      Sent manually from Massic
                    </p>
                  ) : null}
                  {replySource === "auto_massic" ? (
                    <p className="text-[11px] text-general-muted-foreground">
                      Sent automatically from Massic
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Input
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Generated response"
                  />
                  {(isSaving || response !== lastSavedResponse || showSavedState) ? (
                    <div className="text-[11px] text-general-muted-foreground">
                      {isSaving ? "Saving..." : response !== lastSavedResponse ? "Unsaved changes" : "Saved"}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {!hasReply ? (
              <div className="w-24 self-stretch flex flex-col justify-between gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 border-[#d4d4d4] bg-white hover:bg-white"
                  onClick={onIgnore}
                  disabled={isIgnoring || isSending}
                  type="button"
                >
                  {isIgnoring ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Ignore
                </Button>

                <Button
                  className="w-full justify-center gap-2"
                  onClick={handleSendClick}
                  disabled={!response.trim() || isSending}
                  type="button"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Send
                      <SendHorizontal className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <SendReviewReplyDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        onConfirm={handleSendConfirm}
        reviewerName={title}
        replyText={response}
        isSending={isSending}
      />
    </>
  )
}
