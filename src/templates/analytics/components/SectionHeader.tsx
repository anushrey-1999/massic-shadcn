"use client"

import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SectionHeaderProps {
  title: string
  action?: {
    label: string
    onClick?: () => void
  }
  className?: string
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h2 className="text-base font-semibold">{title}</h2>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  )
}
