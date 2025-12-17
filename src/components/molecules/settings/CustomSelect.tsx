"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronDown, X } from "lucide-react";

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
  renderSelected,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  const handleSelect = (optionValue: string) => {
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
    if (e) {
      e.stopPropagation();
    }
    onChange(value.filter((v) => v !== optionValue));
  };

  const defaultRenderSelected = (option: CustomSelectOption) => (
    <Badge
      key={option.value}
      variant="secondary"
      className="text-xs flex items-center gap-1 max-w-[200px]"
      onClick={(e) => e.stopPropagation()}
      title={option.label}
    >
      <span className="truncate max-w-[160px]">{option.label}</span>
      <span
        onClick={(e) => handleRemove(option.value, e)}
        className="hover:bg-muted rounded-full p-0.5 cursor-pointer inline-flex items-center flex-shrink-0"
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
        <X className="h-3 w-3" />
      </span>
    </Badge>
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className={`w-full justify-start min-h-10 h-auto ${className}`}
          style={{ maxWidth }}
          onClick={() => {
            if (!open) {
              setOpen(true);
            }
          }}
        >
          <div className="flex flex-wrap gap-1 w-full items-center py-0.5">
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
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 z-50 overflow-hidden"
        style={{ width: maxWidth }}
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={true} className="overflow-hidden">
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden">
            {options.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        handleSelect(option.value);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(option.value);
                      }}
                      className="cursor-pointer flex items-center overflow-hidden"
                    >
                      <div
                        className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border flex-shrink-0 ${isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50"
                          }`}
                      >
                        {isSelected && <Check className="h-4 w-4" />}
                      </div>
                      <span
                        className="overflow-hidden text-ellipsis whitespace-nowrap block max-w-[calc(100%-30px)]"
                        title={option.label}
                      >
                        {option.label}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

