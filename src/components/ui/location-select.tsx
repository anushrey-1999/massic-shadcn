'use client'

import * as React from 'react'
import { List as ReactWindowList } from 'react-window'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
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
const OVERSCAN_COUNT = 8
const WORKER_SEARCH_THRESHOLD = 2000

type LocationOption = {
  value: string
  label: string
  disabled?: boolean
}

type SearchableOption = {
  value: string
  label: string
}

type WorkerResponse =
  | { type: 'ready'; requestId: number }
  | { type: 'results'; requestId: number; indexes: number[] }
  | { type: 'error'; requestId: number; message: string }

type DisplayOption = LocationOption & {
  optionIndex: number
  itemKey: string
}

type RowProps = {
  items: DisplayOption[]
  selectedValue?: string
  onSelect: (value: string) => void
}

function normalizeSearchText(text: string) {
  return text.trim().toLowerCase()
}

function optionMatchesSearch(option: LocationOption, query: string) {
  const normalizedQuery = normalizeSearchText(query)

  if (!normalizedQuery) return true

  return (
    option.label.toLowerCase().includes(normalizedQuery) ||
    option.value.toLowerCase().includes(normalizedQuery)
  )
}

function Row({
  ariaAttributes,
  index,
  style,
  items,
  selectedValue,
  onSelect,
}: {
  ariaAttributes: {
    'aria-posinset': number
    'aria-setsize': number
    role: 'listitem'
  }
  index: number
  style: React.CSSProperties
  items: DisplayOption[]
  selectedValue?: string
  onSelect: (value: string) => void
}) {
  const option = items[index]
  const isSelected = selectedValue === option.value

  return (
    <div {...ariaAttributes} style={style}>
      <CommandItem
        value={option.itemKey}
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

const VirtualizedCommandItems = React.memo<{
  items: DisplayOption[]
  selectedValue?: string
  onSelect: (value: string) => void
}>(({ items, selectedValue, onSelect }) => {
  const ListComponent = ReactWindowList as any
  const height = Math.min(LISTBOX_HEIGHT, Math.max(ITEM_HEIGHT, items.length * ITEM_HEIGHT))

  return (
    <div style={{ height }}>
      <ListComponent<RowProps>
        height={height}
        width="100%"
        rowHeight={ITEM_HEIGHT}
        rowCount={items.length}
        overscanCount={OVERSCAN_COUNT}
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
  options: LocationOption[]
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
  const [popoverWidth, setPopoverWidth] = React.useState<number | undefined>(undefined)
  const [workerReady, setWorkerReady] = React.useState(false)
  const [workerFailed, setWorkerFailed] = React.useState(false)
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchIndexes, setSearchIndexes] = React.useState<number[] | null>(null)
  const [hasActivatedWorkerSearch, setHasActivatedWorkerSearch] = React.useState(false)

  const triggerRef = React.useRef<HTMLDivElement>(null)
  const workerRef = React.useRef<Worker | null>(null)
  const requestIdRef = React.useRef(0)
  const latestSearchRequestIdRef = React.useRef(0)

  const debouncedSetSearch = useDebouncedCallback((val: string) => {
    setDebouncedSearchValue(val)
  }, 150)

  const validOptions = React.useMemo<DisplayOption[]>(() => {
    return options.reduce<DisplayOption[]>((acc, option) => {
      if (option.disabled || option.value === '') return acc

      acc.push({
        ...option,
        optionIndex: acc.length,
        itemKey: `${acc.length}:${option.value}:${option.label}`,
      })

      return acc
    }, [])
  }, [options])

  const optionByValue = React.useMemo(() => {
    const map = new Map<string, LocationOption>()

    for (const option of validOptions) {
      if (!map.has(option.value)) {
        map.set(option.value, option)
      }
    }

    return map
  }, [validOptions])

  const shouldUseWorkerSearch = validOptions.length >= WORKER_SEARCH_THRESHOLD

  const searchableOptions = React.useMemo<SearchableOption[]>(() => {
    if (!shouldUseWorkerSearch) return []

    return validOptions.map((option) => ({
      value: option.value,
      label: option.label,
    }))
  }, [shouldUseWorkerSearch, validOptions])

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

  React.useEffect(() => {
    if (open && shouldUseWorkerSearch) {
      setHasActivatedWorkerSearch(true)
    }
  }, [open, shouldUseWorkerSearch])

  React.useEffect(() => {
    if (
      !shouldUseWorkerSearch ||
      !hasActivatedWorkerSearch ||
      typeof window === 'undefined' ||
      typeof Worker === 'undefined'
    ) {
      workerRef.current?.terminate()
      workerRef.current = null
      setWorkerReady(false)
      setWorkerFailed(false)
      setIsSearching(false)
      setSearchIndexes(null)
      return
    }

    const worker = new Worker(new URL('./location-search.worker.ts', import.meta.url))
    const initRequestId = ++requestIdRef.current

    workerRef.current?.terminate()
    workerRef.current = worker
    setWorkerReady(false)
    setWorkerFailed(false)
    setIsSearching(false)
    setSearchIndexes(null)

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data

      if (message.type === 'ready') {
        if (message.requestId === initRequestId) {
          setWorkerReady(true)
        }
        return
      }

      if (message.type === 'results') {
        if (message.requestId === latestSearchRequestIdRef.current) {
          setSearchIndexes(message.indexes)
          setIsSearching(false)
        }
        return
      }

      setWorkerFailed(true)
      setIsSearching(false)
    }

    worker.onerror = () => {
      setWorkerFailed(true)
      setWorkerReady(false)
      setIsSearching(false)
    }

    worker.postMessage({
      type: 'init',
      requestId: initRequestId,
      options: searchableOptions,
    })

    return () => {
      worker.terminate()
      if (workerRef.current === worker) {
        workerRef.current = null
      }
    }
  }, [hasActivatedWorkerSearch, searchableOptions, shouldUseWorkerSearch])

  React.useEffect(() => {
    const query = normalizeSearchText(debouncedSearchValue)

    if (!query) {
      setSearchIndexes(null)
      setIsSearching(false)
      return
    }

    if (!shouldUseWorkerSearch || workerFailed) {
      setIsSearching(false)
      return
    }

    const worker = workerRef.current
    if (!worker || !workerReady) {
      setSearchIndexes([])
      setIsSearching(true)
      return
    }

    const requestId = ++requestIdRef.current
    latestSearchRequestIdRef.current = requestId
    setIsSearching(true)
    worker.postMessage({
      type: 'search',
      requestId,
      query,
    })
  }, [debouncedSearchValue, shouldUseWorkerSearch, workerFailed, workerReady])

  const handleInputChange = React.useCallback(
    (val: string) => {
      setInputValue(val)
      debouncedSetSearch(val)
    },
    [debouncedSetSearch]
  )

  const filteredOptions = React.useMemo(() => {
    const query = normalizeSearchText(debouncedSearchValue)

    if (!query) return validOptions

    if (shouldUseWorkerSearch && !workerFailed) {
      return (searchIndexes ?? [])
        .map((optionIndex) => validOptions[optionIndex])
        .filter(Boolean)
    }

    return validOptions.filter((option) => optionMatchesSearch(option, query))
  }, [
    debouncedSearchValue,
    searchIndexes,
    shouldUseWorkerSearch,
    validOptions,
    workerFailed,
  ])

  const selectedOption = value ? optionByValue.get(value) : undefined
  const hasRealSelection = value != null && String(value).trim() !== '' && Boolean(selectedOption)
  const displayValue = hasRealSelection ? selectedOption!.label : placeholder
  const isPlaceholder = loading || !hasRealSelection
  const hasSearchQuery = normalizeSearchText(debouncedSearchValue).length > 0
  const isPreparingSearch =
    hasSearchQuery && shouldUseWorkerSearch && !workerFailed && (!workerReady || isSearching)
  const emptyMessage = isPreparingSearch ? 'Searching locations...' : 'No location found.'

  React.useEffect(() => {
    if (open && triggerRef.current) {
      setPopoverWidth(triggerRef.current.offsetWidth)
    }
  }, [open])

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
    <div ref={triggerRef} className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between text-foreground font-normal',
              !triggerClassName && 'h-10 rounded-lg',
              triggerClassName
            )}
            disabled={disabled || loading}
          >
            <span
              className={cn(
                'truncate',
                isPlaceholder
                  ? 'text-general-muted-foreground text-xs'
                  : 'text-sm text-foreground'
              )}
            >
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
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading locations...
                </div>
              ) : filteredOptions.length > 0 ? (
                <CommandGroup>
                  <VirtualizedCommandItems
                    items={filteredOptions}
                    selectedValue={value}
                    onSelect={(selectedValue) => {
                      onChange(selectedValue)
                      setOpen(false)
                      setInputValue('')
                      setDebouncedSearchValue('')
                      setSearchIndexes(null)
                      setIsSearching(false)
                    }}
                  />
                </CommandGroup>
              ) : (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  {isPreparingSearch ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {emptyMessage}
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
