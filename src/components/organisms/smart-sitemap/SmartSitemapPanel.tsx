import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SmartSitemapPanelProps {
  title?: ReactNode
  trailing?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function SmartSitemapPanel({ title, trailing, children, className, bodyClassName }: SmartSitemapPanelProps) {
  return (
    <section className={cn("min-w-0 rounded-lg border border-general-border bg-white", className)}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-general-border px-4 py-3">
          <h2 className="text-sm font-medium text-general-foreground">{title}</h2>
          {trailing}
        </div>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  )
}
