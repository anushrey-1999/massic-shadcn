"use client"

import * as React from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import type { Option } from "@/types/data-table-types"

interface FacetedProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  value: string | string[]
  onValueChange: (value: string | string[]) => void
  multiple?: boolean
  children: React.ReactNode
}

const FacetedContext = React.createContext<{
  value: string | string[]
  onValueChange: (value: string | string[]) => void
  multiple?: boolean
} | null>(null)

export function Faceted({ open, onOpenChange, value, onValueChange, multiple, children }: FacetedProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  // Check if children already contain a Popover by checking displayName or type
  const hasPopover = React.Children.toArray(children).some(
    (child) => {
      if (!React.isValidElement(child)) return false
      // Check if it's a Popover by displayName or by checking if it's the Popover component
      if (child.type === Popover) return true
      if (typeof child.type === 'object' && child.type !== null && 'displayName' in child.type) {
        return (child.type as { displayName?: string }).displayName === 'Popover'
      }
      return false
    }
  )

  return (
    <FacetedContext.Provider value={{ value, onValueChange, multiple }}>
      {hasPopover ? (
        // If Popover exists, clone it with open state
        React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child
          if (child.type === Popover) {
            return React.cloneElement(child, { open: isOpen, onOpenChange: setIsOpen } as any)
          }
          if (typeof child.type === 'object' && child.type !== null && 'displayName' in child.type) {
            if ((child.type as { displayName?: string }).displayName === 'Popover') {
              return React.cloneElement(child, { open: isOpen, onOpenChange: setIsOpen } as any)
            }
          }
          return child
        })
      ) : (
        // If no Popover, wrap children in one - this ensures proper positioning
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          {children}
        </Popover>
      )}
    </FacetedContext.Provider>
  )
}

export function FacetedTrigger({ asChild, children, ...props }: React.ComponentProps<typeof PopoverTrigger> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    return <PopoverTrigger asChild {...props}>{children}</PopoverTrigger>
  }
  return <PopoverTrigger {...props}>{children}</PopoverTrigger>
}

export function FacetedContent({ id, className, children, align = "start", side = "bottom", sideOffset = 4, ...props }: React.ComponentProps<typeof PopoverContent> & { id?: string }) {
  return (
    <PopoverContent 
      id={id} 
      className={cn("w-[200px] p-0", className)} 
      align={align}
      side={side}
      sideOffset={sideOffset}
      {...props}
    >
      <Command>
        {children}
      </Command>
    </PopoverContent>
  )
}

export function FacetedInput({ ...props }: React.ComponentProps<typeof CommandInput>) {
  return <CommandInput {...props} />
}

export function FacetedList({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <CommandList {...props}>{children}</CommandList>
}

export function FacetedEmpty({ children, ...props }: React.ComponentProps<typeof CommandEmpty>) {
  return <CommandEmpty {...props}>{children}</CommandEmpty>
}

export function FacetedGroup({ children, ...props }: React.ComponentProps<typeof CommandGroup>) {
  return <CommandGroup {...props}>{children}</CommandGroup>
}

export function FacetedItem({ value, children, ...props }: React.ComponentProps<typeof CommandItem> & { value: string }) {
  const context = React.useContext(FacetedContext)
  if (!context) return null

  const isSelected = Array.isArray(context.value)
    ? context.value.includes(value)
    : context.value === value

  const handleSelect = () => {
    if (context.multiple) {
      const currentValue = Array.isArray(context.value) ? context.value : []
      const newValue = isSelected
        ? currentValue.filter((v) => v !== value)
        : [...currentValue, value]
      context.onValueChange(newValue)
    } else {
      context.onValueChange(isSelected ? "" : value)
    }
  }

  return (
    <CommandItem value={value} onSelect={handleSelect} {...props}>
      <div
        className={cn(
          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
          isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
        )}
      >
        <Check className="h-4 w-4" />
      </div>
      {children}
    </CommandItem>
  )
}

export function FacetedBadgeList({ 
  options, 
  placeholder, 
  ...props 
}: { 
  options?: Option[]
  placeholder?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(FacetedContext)
  if (!context) return <span {...props}>{placeholder}</span>

  const selectedValues = Array.isArray(context.value) ? context.value : context.value ? [context.value] : []
  const selectedOptions = options?.filter((opt) => selectedValues.includes(opt.value)) || []

  if (selectedOptions.length === 0) {
    return <span {...props}>{placeholder}</span>
  }

  return (
    <div className="flex flex-wrap gap-1" {...props}>
      {selectedOptions.map((option) => (
        <Badge key={option.value} variant="secondary" className="mr-1">
          {option.label}
        </Badge>
      ))}
    </div>
  )
}

