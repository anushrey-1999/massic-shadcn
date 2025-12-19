"use client"

import { ChevronRight, Download, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[]
  onDownload?: () => void
  onSettings?: () => void
  isButton?: boolean
}

export function PageHeader({ breadcrumbs, onDownload, onSettings, isButton = false }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-7 py-4 border-b border-border">
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1
          
          return (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "font-medium" : "text-muted-foreground"}>
                  {item.label}
                </span>
              )}
            </span>
          )
        })}
      </nav>
      {isButton && (
      <div className="flex items-center gap-2">
        <Button
          className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
          onClick={onDownload}
          >
          <Download className="h-4 w-4" />
          Download Report
        </Button>
        <Button variant="outline" size="icon" className="border-border" onClick={onSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
        )}
    </div>
  )
}

export default PageHeader