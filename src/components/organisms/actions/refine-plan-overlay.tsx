"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { PagesActionsDropdown } from "./pages-actions-dropdown"
import { PostsActionsDropdown } from "./posts-actions-dropdown"
import type { RefinePlanSource } from "./refine-plan-overlay-provider"
import { sendRefinePlanMessage } from "./refine-plan-chatbot-api"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  source: RefinePlanSource
}

type RegenerateMode = "full" | "remaining"

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-4 py-3 text-left text-sm shadow-none",
          isUser
            ? "bg-foreground-light text-general-foreground border-0 rounded-br-none"
            : "border border-general-border bg-white text-general-muted-foreground rounded-bl-none"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

export function RefinePlanOverlay({ open, onOpenChange, businessId, source }: Props) {
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null)
  const prevOverflowRef = React.useRef<string | null>(null)
  const prevOverscrollRef = React.useRef<string | null>(null)

  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [conversationId, setConversationId] = React.useState<string | null>(null)
  const [regenerateOpen, setRegenerateOpen] = React.useState(false)
  const [regenerateMode, setRegenerateMode] = React.useState<RegenerateMode>("full")

  React.useEffect(() => {
    if (typeof document === "undefined") return
    const el =
      document.querySelector<HTMLElement>('[data-slot="actions-page-content"]') ??
      document.querySelector<HTMLElement>('[data-slot="sidebar-inset"]')
    setPortalTarget(el)
  }, [])

  React.useEffect(() => {
    if (!open) return
    setMessages([
      {
        id: "a-1",
        role: "assistant",
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla, mattis ligula consectetur, ultrices mauris.",
      },
      {
        id: "u-1",
        role: "user",
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla, mattis ligula consectetur, ultrices mauris.",
      },
      {
        id: "a-2",
        role: "assistant",
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla, mattis ligula consectetur, ultrices mauris.",
      },
    ])
    setInput("")
    setIsSending(false)
    setConversationId(null)
    setRegenerateOpen(false)
    setRegenerateMode("full")
  }, [open, source])

  React.useEffect(() => {
    if (!portalTarget) return
    const restore = () => {
      if (prevOverflowRef.current !== null) {
        portalTarget.style.overflow = prevOverflowRef.current
        prevOverflowRef.current = null
      }
      if (prevOverscrollRef.current !== null) {
        ;(portalTarget.style as any).overscrollBehavior = prevOverscrollRef.current
        prevOverscrollRef.current = null
      }
    }

    if (!open) {
      restore()
      return
    }

    prevOverflowRef.current = portalTarget.style.overflow
    prevOverscrollRef.current = (portalTarget.style as any).overscrollBehavior

    portalTarget.style.overflow = "hidden"
    ;(portalTarget.style as any).overscrollBehavior = "none"

    return restore
  }, [open, portalTarget])

  const handleClose = React.useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const handleSend = React.useCallback(async () => {
    const text = input.trim()
    if (!text || isSending) return

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsSending(true)

    try {
      const response = await sendRefinePlanMessage({
        message: text,
        businessId,
        source,
        conversationId: conversationId || undefined,
      })
      setConversationId(response.conversationId)
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: response.message },
      ])
    } finally {
      setIsSending(false)
    }
  }, [input, isSending, businessId, source, conversationId])

  if (!open) return null

  const content = (
    <div
      className="absolute inset-0 z-50 bg-foreground-light"
      role="dialog"
      aria-label="Refine plan"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose()
      }}
    >
      <div className="absolute inset-0 p-5">
        <div className="h-full w-full max-w-[1224px] overflow-hidden rounded-2xl bg-white">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 px-6 pt-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleClose}
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-xl font-semibold text-general-foreground">Refine Plan</div>
          </div>

            <div className="flex flex-1 min-h-0 flex-col px-6 pb-6 pt-2">
              <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex min-h-0 flex-col">
                  {source === "pages" ? (
                    <PagesActionsDropdown mode="table" />
                  ) : (
                    <PostsActionsDropdown mode="table" />
                  )}

                  <Button
                    type="button"
                    size={'lg'}
                    className="mt-2 w-full rounded-md bg-general-primary text-primary-foreground"
                    onClick={() => setRegenerateOpen(true)}
                  >
                    Regenerate Plan
                  </Button>
                </div>

                <div className="flex min-h-0 flex-col items-center">
                  <div className="flex-1 min-h-0 w-full overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="mx-auto w-full max-w-[552px] space-y-4 px-2 py-5 pb-7">
                        {messages.map((m) => (
                          <Bubble key={m.id} message={m} />
                        ))}
                        {isSending ? (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] rounded-xl rounded-bl-none border border-general-border bg-white px-4 py-3 text-left shadow-none">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Thinking…</span>
                              </div>
                              <div className="mt-3 space-y-2">
                                <div className="h-2 w-48 rounded bg-muted/60 animate-pulse" />
                                <div className="h-2 w-64 rounded bg-muted/60 animate-pulse" />
                                <div className="h-2 w-40 rounded bg-muted/60 animate-pulse" />
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>

              <div className="shrink-0 w-full pt-10">
                <div className="border-none rounded-none flex items-center">
                  <div className="pt-0 max-w-[600px] w-full mx-auto">
                    <div className="relative bg-foreground-light p-2 rounded-xl">
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type any adjustments you want to make to your web planner..."
                        className="min-h-[52px] max-h-24 resize-none overflow-y-auto pr-14 rounded-lg shadow-none border-none py-3.5 leading-6 placeholder:text-base md:placeholder:text-sm placeholder:leading-6"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            void handleSend()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-9 w-9"
                        onClick={() => void handleSend()}
                        disabled={input.trim().length === 0 || isSending}
                        aria-label="Send"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <DialogOverlay className="z-60 bg-black/50 backdrop-blur-sm" />
        <DialogContent
          className={cn(
            "z-61 w-[600px] max-w-[calc(100vw-2rem)] p-6 gap-4 rounded-xl",
            "border border-general-border shadow-lg"
          )}
          showCloseButton={false}
        >
          <div className="flex items-center">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.48px] text-general-foreground">
              Regenerate Plan?
            </DialogTitle>
          </div>

          <Separator className="w-full" />

          <div className="flex flex-col gap-8">
            <div className="text-sm font-normal leading-relaxed tracking-[0.07px] text-general-foreground/80">
              This generates a new proposed plan. Your active plan remains unchanged until you
              confirm.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setRegenerateMode("full")}
                className={cn(
                  "flex-1 rounded-xl p-3 text-left",
                  "flex flex-col gap-3",
                  regenerateMode === "full"
                    ? "border border-[#2e6a56] bg-[rgba(110,193,166,0.1)]"
                    : "border border-transparent bg-secondary"
                )}
                aria-pressed={regenerateMode === "full"}
              >
                <div className="text-base font-medium leading-relaxed text-general-foreground">
                  Full Plan
                </div>
                <div className="text-xs font-normal leading-relaxed tracking-[0.18px] text-general-foreground/80">
                  Regenerate all pages, including those that have already been executed.
                </div>
                <div className="text-[10px] font-medium leading-relaxed tracking-[0.15px] text-general-muted-foreground">
                  30 new pages will be regenerated.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRegenerateMode("remaining")}
                className={cn(
                  "flex-1 rounded-xl p-3 text-left",
                  "flex flex-col gap-3",
                  regenerateMode === "remaining"
                    ? "border border-[#2e6a56] bg-[rgba(110,193,166,0.1)]"
                    : "border border-transparent bg-secondary"
                )}
                aria-pressed={regenerateMode === "remaining"}
              >
                <div className="text-base font-medium leading-relaxed text-general-foreground">
                  Remaining Only
                </div>
                <div className="text-xs font-normal leading-relaxed tracking-[0.18px] text-general-foreground/80">
                  Only regenerates pages that have not been executed.
                </div>
                <div className="text-[10px] font-medium leading-relaxed tracking-[0.15px] text-general-muted-foreground">
                  6 new pages will be regenerated.
                </div>
              </button>
            </div>
          </div>

          <div className="pt-0">
            <Button
              type="button"
              className="h-10 w-full rounded-lg bg-general-primary text-primary-foreground"
              onClick={() => {
                // API hook will be added once endpoint is ready.
                setRegenerateOpen(false)
              }}
            >
              Regenerate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  return portalTarget ? createPortal(content, portalTarget) : content
}

