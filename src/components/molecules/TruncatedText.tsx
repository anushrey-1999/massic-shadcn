"use client"

import { useRef, useState } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface TruncatedTextProps {
  text: string
  className?: string
}

/** Single-line text that ellipsizes and shows the full value on hover only when it overflows. */
export function TruncatedText({ text, className }: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <Tooltip
      open={open}
      onOpenChange={(next) => {
        const element = ref.current
        setOpen(next && Boolean(element && element.scrollWidth > element.clientWidth))
      }}
    >
      <TooltipTrigger asChild>
        <span ref={ref} className={cn("block min-w-0 truncate", className)}>
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[420px] whitespace-normal break-all text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
