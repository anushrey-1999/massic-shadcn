"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AutomationSequenceCardProps {
  id: string
  type: "email" | "sms"
  subject?: string
  content?: string
  sequenceDay?: number
  onDelete?: (id: string) => void
  onUpdate?: (id: string, data: Partial<AutomationSequenceCardData>) => void
  className?: string
}

export interface AutomationSequenceCardData {
  subject?: string
  content?: string
  sequenceDay?: number
}

export const AutomationSequenceCard = React.forwardRef<
  HTMLDivElement,
  AutomationSequenceCardProps
>(
  (
    {
      id,
      type,
      subject = "",
      content = "",
      sequenceDay = 0,
      onDelete,
      onUpdate,
      className,
    },
    ref
  ) => {
    const [isPreview, setIsPreview] = React.useState(false)
    const [localSubject, setLocalSubject] = React.useState(subject)
    const [localContent, setLocalContent] = React.useState(content)
    const [localDay, setLocalDay] = React.useState(sequenceDay)

    const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setLocalSubject(newValue)
      onUpdate?.(id, { subject: newValue })
    }

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setLocalContent(newValue)
      onUpdate?.(id, { content: newValue })
    }

    const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(e.target.value, 10) || 0
      setLocalDay(newValue)
      onUpdate?.(id, { sequenceDay: newValue })
    }

    return (
      <Card ref={ref} className={cn("w-full bg-card border border-general-border", className)}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Header with type badge and actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-general-secondary text-general-foreground">
                  {type === "email" ? "📧 Email" : "💬 SMS"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsPreview(!isPreview)}
                >
                  {isPreview ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:text-red-500"
                  onClick={() => onDelete?.(id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Main content area */}
            {!isPreview ? (
              <div className="flex flex-col gap-4">
                {/* Sequence timing */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-general-foreground">
                      Send
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={localDay}
                      onChange={handleDayChange}
                      placeholder="0"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-general-foreground">
                      days later
                    </Label>
                  </div>
                </div>

                {/* Subject */}
                {type === "email" && (
                  <div>
                    <Label className="text-xs font-medium text-general-foreground">
                      Subject
                    </Label>
                    <Input
                      value={localSubject}
                      onChange={handleSubjectChange}
                      placeholder="Enter email subject"
                      className="h-9 text-sm mt-1"
                    />
                  </div>
                )}

                {/* Content */}
                <div>
                  <Label className="text-xs font-medium text-general-foreground">
                    Content
                  </Label>
                  <textarea
                    value={localContent}
                    onChange={handleContentChange}
                    placeholder={`Enter ${type} content`}
                    className={cn(
                      "w-full px-3 py-2 text-sm border rounded-lg",
                      "border-general-border bg-general-input text-general-foreground",
                      "placeholder-general-foreground/40",
                      "focus:outline-none focus:ring-2 focus:ring-general-border focus:border-transparent",
                      "resize-none"
                    )}
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              /* Preview mode */
              <div className="flex flex-col gap-3 p-4 bg-general-secondary rounded-lg">
                {type === "email" && localSubject && (
                  <div>
                    <p className="text-xs font-medium text-general-foreground/60 mb-1">
                      Subject:
                    </p>
                    <p className="text-sm font-medium text-general-foreground">
                      {localSubject}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-general-foreground/60 mb-1">
                    Content:
                  </p>
                  <p className="text-sm text-general-foreground whitespace-pre-wrap">
                    {localContent || "(Empty)"}
                  </p>
                </div>
                <div className="text-xs text-general-foreground/60 pt-2 border-t border-general-border">
                  Sends {localDay} day{localDay !== 1 ? "s" : ""} later
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)

AutomationSequenceCard.displayName = "AutomationSequenceCard"
