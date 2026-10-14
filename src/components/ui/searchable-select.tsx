"use client";

import * as React from "react";
import { ChevronDown, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VirtualizedCommandOptions } from "@/components/ui/virtualized-command-options";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  disabled?: boolean;
  className?: string;
};

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found",
  loading = false,
  error,
  onRetry,
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const deferredSearchValue = React.useDeferredValue(searchValue);
  const optionByValue = React.useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options]
  );
  const selected = optionByValue.get(value);
  const selectedValues = React.useMemo(
    () => new Set(value ? [value] : []),
    [value]
  );
  const filteredOptions = React.useMemo(() => {
    const query = deferredSearchValue.trim().toLowerCase();
    if (!query) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query)
    );
  }, [deferredSearchValue, options]);

  React.useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearchValue("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between rounded-md border-input bg-white px-3 text-sm font-normal text-general-foreground shadow-none disabled:cursor-not-allowed disabled:border-general-border disabled:bg-general-secondary disabled:text-general-foreground disabled:opacity-100",
            !selected && "text-xs text-general-muted-foreground/70",
            className
          )}
        >
          <span className="truncate">
            {selected?.label || value || placeholder}
          </span>
          {loading ? (
            <Loader2 className="size-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[100] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden bg-white p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={searchValue}
            onValueChange={setSearchValue}
            placeholder={searchPlaceholder}
          />
          <CommandList className="overflow-hidden">
            {error ? (
              <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                <p className="text-xs text-destructive">{error}</p>
                {onRetry ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onRetry}
                    className="gap-1.5"
                  >
                    <RefreshCw className="size-3.5" />
                    Retry
                  </Button>
                ) : null}
              </div>
            ) : loading && options.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-general-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading options...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-general-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <VirtualizedCommandOptions
                options={filteredOptions}
                selectedValues={selectedValues}
                onSelect={(nextValue) => {
                  onChange(nextValue);
                  setOpen(false);
                  setSearchValue("");
                }}
              />
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
