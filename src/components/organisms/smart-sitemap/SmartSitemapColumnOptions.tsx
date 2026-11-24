"use client"

import { Check, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { SITEMAP_COLUMNS } from "./sitemapColumns"

/** Show or hide the columns after Page; same control as the shared data tables. */
export function SmartSitemapColumnOptions({
  hidden,
  onToggle,
}: {
  hidden: readonly string[]
  onToggle: (columnId: string) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Toggle columns"
          variant="outline"
          className="hidden h-9 w-9 min-w-9 bg-white p-0 font-normal lg:flex"
        >
          <Settings2 className="size-4 text-general-muted-foreground" strokeWidth={1.5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-0">
        <Command>
          <CommandInput placeholder="Search columns..." />
          <CommandList>
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              {SITEMAP_COLUMNS.map((column) => {
                const visible = !hidden.includes(column.id)
                return (
                  <CommandItem key={column.id} value={`${column.id} ${column.label}`} onSelect={() => onToggle(column.id)}>
                    <span className="truncate">{column.label}</span>
                    <Check className={cn("ml-auto size-4 shrink-0", visible ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
