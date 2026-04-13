"use client"

import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"
import { FileChartColumn, TextSearch, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavItem {
  id: string
  label: string
}

interface NavigationTabsProps {
  items: NavItem[]
  activeSection: string
  periodSelector?: React.ReactNode
  onSectionChange?: (id: string) => void
}

export function NavigationTabs({
  items,
  activeSection,
  periodSelector,
  onSectionChange,
}: NavigationTabsProps) {
  const router = useRouter()
  const pathname = usePathname()

  const businessId = pathname.match(/^\/business\/([^/]+)/)?.[1]

  const handleTabClick = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.preventDefault()
    if (onSectionChange) {
      onSectionChange(id)
    }

    // For discovery, scroll to organic section instead
    const targetId = id === "discovery" ? "organic" : id

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const element = document.getElementById(targetId)

      if (element) {
        // Use scrollIntoView which respects scroll-margin-top CSS property
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    })
  }

  return (
    <div className="flex items-center justify-between py-4 bg-foreground-light border-b border-general-border">
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-primary-foreground rounded-xl p-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={(e) => handleTabClick(e, item.id)}
              className={cn(
                "w-[125px] py-1.5 text-sm font-medium cursor-pointer rounded-lg transition-all whitespace-nowrap leading-[150%]",
                activeSection === item.id
                  ? "bg-white shadow-sm"
                  : "text-general-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {periodSelector}
      </div>

      <TooltipProvider>
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-transparent"
                onClick={() => businessId && router.push(`/business/${businessId}/reports`)}
                disabled={!businessId}
              >
                <FileChartColumn className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reports</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-transparent"
                onClick={() => businessId && router.push(`/business/${businessId}/organic-deepdive`)}
                disabled={!businessId}
              >
                <TextSearch className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Organic Deep Dive</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  )
}
