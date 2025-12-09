"use client"

import { cn } from "@/lib/utils"

interface NavItem {
  id: string
  label: string
}

interface NavigationTabsProps {
  items: NavItem[]
  activeSection: string
  periodSelector?: React.ReactNode
}

export function NavigationTabs({
  items,
  activeSection,
  periodSelector,
}: NavigationTabsProps) {
  const handleTabClick = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="flex items-center justify-between px-7 py-4">
      <div className="flex items-center bg-muted/40 rounded-lg p-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={(e) => handleTabClick(e, item.id)}
            className={cn(
              "px-5 py-2 text-sm font-medium cursor-pointer rounded-lg transition-all whitespace-nowrap",
              activeSection === item.id
                ? "bg-white shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {periodSelector}
    </div>
  )
}
