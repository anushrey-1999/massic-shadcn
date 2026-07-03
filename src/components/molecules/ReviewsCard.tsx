"use client"

import React from "react"
import { Star, SendHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"
import { useCanFeatureAction, useFeatureActionGuard } from "@/hooks/use-permissions"
import { SendReviewReplyDialog } from "@/components/molecules/SendReviewReplyDialog"

export interface ReviewsCardProps {
  reviewId: string
  businessId: string
  title: string
  reviewText: string
  rating: number
  reviewerImageSrc?: string
  reviewerReviewCount?: number
  createdAt?: string
  generatedResponse?: string | null
  editedResponse?: string | null
  existingReply?: string | null
  replySource?: string | null
  isSending?: boolean
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

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    if (diffYears >= 1) return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`
    if (diffMonths >= 1) return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`
    if (diffDays >= 1) return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`
    if (diffHours >= 1) return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`
    if (diffMins >= 1) return diffMins === 1 ? "1 minute ago" : `${diffMins} minutes ago`
    return "just now"
  } catch {
    return ""
  }
}

export function ReviewsCard({
  reviewId,
  businessId,
  title,
  reviewText,
  rating,
  reviewerImageSrc,
  reviewerReviewCount,
  createdAt,
  generatedResponse,
  editedResponse,
  existingReply,
  replySource,
  isSending = false,
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
  const canUpdateReply = useCanFeatureAction("reviews.replies.update")
  const guardUpdateReply = useFeatureActionGuard("reviews.replies.update")
  const guardSendReply = useFeatureActionGuard("reviews.replies.send")

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
      if (url.hostname.includes('googleusercontent.com') || url.hostname.includes('ggpht.com')) {
        url.searchParams.set('sz', '48')
      }
      return url.toString()
    } catch {
      return reviewerImageSrc
    }
  }, [reviewerImageSrc, imageError])

  React.useEffect(() => {
    if (!onAutoSave || hasReply) return
    if (debouncedResponse === lastSavedResponse) return

    setShowSavedState(false)
    autoSave(debouncedResponse).catch(() => {
      setIsSaving(false)
    })
  }, [debouncedResponse, hasReply, lastSavedResponse, onAutoSave])

  const handleSendClick = React.useCallback(() => {
    if (!guardSendReply()) return
    if (!response.trim()) return
    setSendDialogOpen(true)
  }, [guardSendReply, response])

  const handleSendConfirm = React.useCallback(async () => {
    if (!guardSendReply()) return
    if (!onSend) return

    await onSend(response)
    setSendDialogOpen(false)
  }, [guardSendReply, onSend, response])

  const handleResponseChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!guardUpdateReply()) return
      setResponse(event.target.value)
    },
    [guardUpdateReply]
  )

  const relativeTime = React.useMemo(
    () => (createdAt ? formatRelativeTime(createdAt) : ""),
    [createdAt]
  )

  return (
    <>
      <div className="w-full bg-secondary rounded-lg p-4 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
              {optimizedImageSrc && !imageError ? (
                <img
                  src={optimizedImageSrc}
                  alt=""
                  loading="lazy"
                  onError={() => setImageError(true)}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <div className="h-full w-full rounded-full flex items-center justify-center text-xs font-medium text-gray-600 bg-gray-200">
                  {title.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center leading-normal">
              <p className="text-sm font-medium text-general-foreground tracking-[0.07px]">
                {title}
              </p>
              {reviewerReviewCount != null && (
                <p className="text-xs text-general-muted-foreground tracking-[0.18px]">
                  {reviewerReviewCount} {reviewerReviewCount === 1 ? "review" : "reviews"}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RatingStars value={rating} />
            {relativeTime && (
              <span className="text-[10px] text-general-muted-foreground tracking-[0.15px]">
                {relativeTime}
              </span>
            )}
          </div>

          <p className="text-xs text-general-foreground leading-normal tracking-[0.18px]">
            {reviewText}
          </p>
        </div>

        <div className="flex items-end gap-3 w-full">
          <div className="flex-1 bg-white rounded-lg p-2">
            <div className="text-xs text-general-muted-foreground pb-2">
              {hasReply ? "Reply" : "Auto-generated Response"}
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
              <div className="relative">
                <Input
                  value={response}
                  onChange={handleResponseChange}
                  onFocus={() => {
                    if (!canUpdateReply) guardUpdateReply()
                  }}
                  readOnly={!canUpdateReply}
                  placeholder="Generated response"
                  className="w-full"
                />
                {(isSaving || response !== lastSavedResponse || showSavedState) ? (
                  <p className="text-[11px] text-general-muted-foreground mt-1">
                    {isSaving ? "Saving..." : response !== lastSavedResponse ? "Unsaved changes" : "Saved"}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {!hasReply ? (
            <div className="flex flex-col gap-2 shrink-0 w-[91.5px] justify-end">
              <Button
                className="w-full justify-center gap-2"
                onClick={handleSendClick}
                disabled={!response.trim() || isSending}
                type="button"
              >
                {isSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    Send
                    <SendHorizontal className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>
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
