'use client'

import * as React from 'react'
import { List as ReactWindowList } from 'react-window'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'

const LISTBOX_HEIGHT = 250
const ITEM_HEIGHT = 36

// Row component for virtualized list
type RowProps = {
  items: Array<{ value: string; label: string; disabled?: boolean }>
  selectedValue?: string
  onSelect: (value: string) => void
}

function Row({
  index,
  style,
  items,
  selectedValue,
  onSelect,
}: {
  index: number
  style: React.CSSProperties
  items: Array<{ value: string; label: string; disabled?: boolean }>
  selectedValue?: string
  onSelect: (value: string) => void
}) {
  const option = items[index]
  const isSelected = selectedValue === option.value

  return (
    <div style={style}>
      <CommandItem
        value={option.value}
        onSelect={() => onSelect(option.value)}
        className={cn(
          'h-9 cursor-pointer flex items-center justify-between',
          isSelected && 'bg-accent'
        )}
      >
        <span className="truncate flex-1">{option.label}</span>
        <Check
          className={cn(
            'ml-2 h-4 w-4 shrink-0',
            isSelected ? 'opacity-100' : 'opacity-0'
          )}
        />
      </CommandItem>
    </div>
  )
}

// Virtualized wrapper that renders CommandItems
const VirtualizedCommandItems = React.memo<{
  items: Array<{ value: string; label: string; disabled?: boolean }>
  selectedValue?: string
  onSelect: (value: string) => void
}>(({ items, selectedValue, onSelect }) => {
  const ListComponent = ReactWindowList as any
  
  return (
    <div className="h-[250px]">
      <ListComponent<RowProps>
        height={LISTBOX_HEIGHT}
        width="100%"
        rowHeight={ITEM_HEIGHT}
        rowCount={items.length}
        overscanCount={5}
        rowComponent={Row}
        rowProps={{
          items,
          selectedValue,
          onSelect,
        }}
      />
    </div>
  )
})

VirtualizedCommandItems.displayName = 'VirtualizedCommandItems'

interface LocationSelectProps {
  value?: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  className?: string
  triggerClassName?: string
}

export function LocationSelect({
  value,
  onChange,
  options,
  placeholder = 'Select location',
  disabled = false,
  loading = false,
  className,
  triggerClassName,
}: LocationSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState('')
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const [popoverWidth, setPopoverWidth] = React.useState<number | undefined>(undefined)

  const findScrollableAncestor = React.useCallback((el: HTMLElement | null) => {
    if (!el) return null
    const isScrollable = (node: HTMLElement) => {
      const style = window.getComputedStyle(node)
      const overflowY = style.overflowY
      if (overflowY !== 'auto' && overflowY !== 'scroll') return false
      return node.scrollHeight > node.clientHeight
    }

    let current: HTMLElement | null = el
    while (current) {
      if (isScrollable(current)) return current
      current = current.parentElement
    }
    return null
  }, [])

  // Debounce the search value for filtering (not the input value)
  const debouncedSetSearch = useDebouncedCallback((val: string) => {
    setDebouncedSearchValue(val)
  }, 150)

  // Update input value immediately and debounce the search
  const handleInputChange = React.useCallback((val: string) => {
    setInputValue(val)
    debouncedSetSearch(val)
  }, [debouncedSetSearch])

  // Filter options based on search - exclude placeholder option
  const validOptions = React.useMemo(() => {
    return options.filter((opt) => !opt.disabled && opt.value !== '')
  }, [options])

  const filteredOptions = React.useMemo(() => {
    if (!debouncedSearchValue) {
      // When no search, limit to first 1000 for performance
      return validOptions.slice(0, 1000)
    }

    // When searching, filter and limit results
    const searchLower = debouncedSearchValue.toLowerCase()
    const filtered = validOptions.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    )

    // Limit search results to 500 for better performance
    return filtered.slice(0, 500)
  }, [validOptions, debouncedSearchValue])

  // Find selected option label.
  // Some callsites include a disabled placeholder option with empty value.
  // Treat that as "no selection" so the closed trigger shows the placeholder styling.
  const selectedOption = options.find(
    (opt) => opt.value === value && !opt.disabled && opt.value !== ''
  )
  const hasRealSelection =
    value != null && String(value).trim() !== '' && Boolean(selectedOption)
  const displayValue = hasRealSelection ? selectedOption!.label : placeholder
  const isPlaceholder = loading || !hasRealSelection

  // Measure trigger width when it opens
  React.useEffect(() => {
    if (open && triggerRef.current) {
      const width = triggerRef.current.offsetWidth
      setPopoverWidth(width)
    }
  }, [open])

  // When this select is inside a custom scroll container (like ProfileStepCard),
  // Radix Popover is portalled to the body. If the container scrolls, the popover
  // can appear "stuck" over the page. Close on scroll to avoid broken UI.
  React.useEffect(() => {
    if (!open) return
    if (typeof window === 'undefined') return

    const triggerEl = triggerRef.current
    const scrollParent = findScrollableAncestor(triggerEl)
    const onScroll = () => setOpen(false)

    scrollParent?.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scrollParent?.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open, findScrollableAncestor])

  return (
    <div ref={triggerRef} className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              // Match input-like typography/colors (not CTA button styling)
              "w-full justify-between text-foreground font-normal",
              // Only apply default classes if triggerClassName doesn't override them
              !triggerClassName && "h-10 rounded-lg",
              triggerClassName
            )}
            disabled={disabled || loading}
          >
            <span className={cn(
              "truncate",
              isPlaceholder ? "text-general-muted-foreground text-xs" : "text-sm text-foreground"
            )}>
              {loading ? 'Loading locations...' : displayValue}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
      <PopoverContent 
        className="p-0" 
        align="start"
        style={popoverWidth ? { width: `${popoverWidth}px` } : undefined}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search location..."
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList className="max-h-[250px] overflow-hidden">
            <CommandEmpty>No location found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.length > 0 ? (
                <VirtualizedCommandItems
                  items={filteredOptions}
                  selectedValue={value}
                  onSelect={(selectedValue) => {
                    onChange(selectedValue)
                    setOpen(false)
                    setInputValue('')
                    setDebouncedSearchValue('')
                  }}
                />
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    </div>
  )
}

