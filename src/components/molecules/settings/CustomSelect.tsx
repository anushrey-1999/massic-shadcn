"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { ChevronDown, Loader2, X } from "lucide-react";
import { VirtualizedCommandOptions } from "@/components/ui/virtualized-command-options";

export interface CustomSelectOption {
  value: string;
  label: string;
  [key: string]: any; // Allow additional properties
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  maxWidth?: string;
  disabled?: boolean;
  loading?: boolean;
  renderSelected?: (option: CustomSelectOption, onRemove: () => void) => React.ReactNode;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select options",
  searchPlaceholder = "Search...",
  emptyMessage = "No options available",
  className = "",
  maxWidth = "300px",
  disabled = false,
  loading = false,
  renderSelected,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = React.useDeferredValue(searchValue);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const optionByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options]
  );
  const selectedOptions = value.map(
    (selectedValue) =>
      optionByValue.get(selectedValue) ?? {
        value: selectedValue,
        label: selectedValue,
      }
  );
  const selectedValues = useMemo(() => new Set(value), [value]);
  const filteredOptions = useMemo(() => {
    const query = deferredSearchValue.trim().toLowerCase();
    if (!query) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query)
    );
  }, [deferredSearchValue, options]);

  const handleSelect = (optionValue: string) => {
    if (disabled) return;
    const isSelected = value.includes(optionValue);

    // Handle mutual exclusivity: "no-location-exist" and regular locations
    if (optionValue === "no-location-exist") {
      // If selecting "no-location-exist", clear all other selections
      onChange(isSelected ? [] : ["no-location-exist"]);
    } else {
      // If selecting a regular location, remove "no-location-exist" if present
      const valuesWithoutNoLocation = value.filter((v) => v !== "no-location-exist");
      const newValues = isSelected
        ? valuesWithoutNoLocation.filter((v) => v !== optionValue)
        : [...valuesWithoutNoLocation, optionValue];
      onChange(newValues);
    }
  };

  const handleRemove = (optionValue: string, e?: React.MouseEvent) => {
    if (disabled) return;
    if (e) {
      e.stopPropagation();
    }
    onChange(value.filter((v) => v !== optionValue));
  };

  const defaultRenderSelected = (option: CustomSelectOption) => (
    <Badge
      key={option.value}
      variant="secondary"
      className="text-xs flex items-center gap-1 max-w-[200px] bg-foreground-light"
      onClick={(e) => e.stopPropagation()}
      title={option.label}
    >
      <span className="truncate max-w-40 font-normal text-[10px] text-general-secondary-foreground">{option.label}</span>
      {!disabled ? (
        <span
          onClick={(e) => handleRemove(option.value, e)}
          className="hover:bg-muted rounded-full p-0.5 cursor-pointer inline-flex items-center shrink-0"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              handleRemove(option.value);
            }
          }}
        >
          <X className="h-2 w-2" />
        </span>
      ) : null}
    </Badge>
  );

  return (
    <Popover
      open={!disabled && open}
      onOpenChange={(nextOpen) => {
        if (!disabled) {
          setOpen(nextOpen);
          if (!nextOpen) setSearchValue("");
        }
      }}
      modal={false}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          disabled={disabled}
          className={`min-h-10 h-auto w-full justify-start px-2 py-1.5 disabled:cursor-not-allowed disabled:border-general-border disabled:bg-general-secondary disabled:text-general-foreground disabled:opacity-100 disabled:shadow-none ${className}`}
          style={maxWidth === "100%" ? undefined : { maxWidth }}
          onClick={() => {
            if (!disabled && !open) {
              setOpen(true);
            }
          }}
        >
          <div className="flex flex-wrap gap-1 w-full items-center py-0.5 ">
            {selectedOptions.length > 0 ? (
              <>
                {selectedOptions.map((option) =>
                  renderSelected ? (
                    <React.Fragment key={option.value}>
                      {renderSelected(option, () => handleRemove(option.value))}
                    </React.Fragment>
                  ) : (
                    defaultRenderSelected(option)
                  )
                )}
              </>
            ) : (
              <span className="text-muted-foreground text-xs font-normal">{placeholder}</span>
            )}
            {loading ? (
              <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin opacity-50" />
            ) : (
              <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden bg-white p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} className="overflow-hidden">
          <CommandInput
            value={searchValue}
            onValueChange={setSearchValue}
            placeholder={searchPlaceholder}
          />
          <CommandList className="overflow-hidden">
            {loading && options.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading options...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <VirtualizedCommandOptions
                options={filteredOptions}
                selectedValues={selectedValues}
                onSelect={handleSelect}
              />
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
