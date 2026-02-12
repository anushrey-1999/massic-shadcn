"use client"

import React from "react"
import { Star, X, SendHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface ReviewsCardProps {
  title: string
  reviewText: string
  rating: number
  reviewerImageSrc?: string
  generatedResponse?: string
  existingReply?: string | null
  isIgnored?: boolean
  isIgnoring?: boolean
  onIgnore?: () => void
  onSend?: (response: string) => void
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
  title,
  reviewText,
  rating,
  reviewerImageSrc,
  generatedResponse = "So glad you like it. Next one’s on the house!",
  existingReply,
  isIgnored = false, isIgnoring = false, onIgnore,
  onSend,
}: ReviewsCardProps) {
  const [response, setResponse] = React.useState(generatedResponse)
  const [status, setStatus] = React.useState<"draft" | "sent">("draft")
  const [imageError, setImageError] = React.useState(false)

  const hasReply = Boolean(existingReply && existingReply.trim())
  const shouldShowResponseBox = hasReply || (!isIgnored && !hasReply)

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
  const handleSend = React.useCallback(() => {
    setStatus("sent")
    onSend?.(response)
  }, [onSend, response])

  return (
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
              {hasReply ? "Reply" : status === "sent" ? "Auto-generated Response" : "Generated Response"}
            </div>

            {hasReply ? (
              <p className="text-sm font-medium text-general-foreground tracking-[0.07px]">
                {existingReply}
              </p>
            ) : status === "sent" ? (
              <p className="text-sm font-medium text-general-foreground tracking-[0.07px]">
                {response}
              </p>
            ) : (
              <Input
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Generated response"
              />
            )}
          </div>

          {!hasReply && status === "draft" ? (
            <div className="w-24 self-stretch flex flex-col justify-between gap-2">
              <Button
                variant="outline"
                className="w-full justify-center gap-2 border-[#d4d4d4] bg-white hover:bg-white"
                onClick={onIgnore}
                disabled={isIgnoring}
                type="button"
              >
                {isIgnoring ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Ignore
              </Button>

              <Button className="w-full justify-center gap-2" onClick={handleSend} type="button">
                Send
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

