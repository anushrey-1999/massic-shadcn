"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import TextWithPill from "@/components/molecules/TextWithPill";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { GA4Property } from "@/hooks/use-linked-businesses";

interface Ga4SearchableSelectProps {
  options: GA4Property[];
  selectedPropertyId?: string;
  selectedGa4?: GA4Property | null;
  onChange: (propertyId: string | null) => void;
  disabled?: boolean;
  loading?: boolean;
  /** Needed inside a Dialog so the portaled list keeps wheel scrolling. */
  modal?: boolean;
}

export function Ga4SearchableSelect({
  options,
  selectedPropertyId,
  selectedGa4,
  onChange,
  disabled = false,
  loading = false,
  modal = false,
}: Ga4SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const showClearButton = Boolean(selectedGa4) && !disabled;

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <Popover
      modal={modal}
      open={!disabled && open}
      onOpenChange={(nextOpen) => {
        if (!disabled) setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="min-h-10 h-auto w-full max-w-[300px] cursor-pointer items-center justify-between whitespace-normal rounded-md border px-3 py-2 font-normal hover:bg-muted/70 disabled:cursor-not-allowed"
        >
          {selectedGa4 ? (
            <div className="flex w-full items-center justify-between gap-1 overflow-hidden">
              <TextWithPill
                displayName={
                  selectedGa4.displayName ||
                  selectedGa4.propertyDisplayName ||
                  ""
                }
                propertyId={selectedGa4.propertyId}
                accountName={selectedGa4.accountName}
                accountId={selectedGa4.accountId}
              />
              <div className="flex shrink-0 items-center gap-1">
                {showClearButton ? (
                  <span
                    role="button"
                    tabIndex={0}
                    className="flex size-4 cursor-pointer items-center justify-center rounded-full hover:bg-muted"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onChange(null);
                      setOpen(false);
                    }}
                  >
                    <X className="size-3 text-general-muted-foreground" />
                  </span>
                ) : null}
                <ChevronDown className="size-4 text-general-muted-foreground" />
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-normal text-general-muted-foreground">
                {loading ? "Loading GA4 properties..." : "Select GA4"}
              </span>
              <ChevronDown className="size-4 shrink-0 text-general-muted-foreground" />
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search GA4 property..." />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No GA4 properties found.</CommandEmpty>
            <CommandGroup>
              {options.map((ga4) => {
                const isSelected = selectedPropertyId === ga4.propertyId;
                const searchValue = [
                  ga4.displayName,
                  ga4.propertyDisplayName,
                  ga4.propertyId,
                  ga4.accountName,
                  ga4.accountId,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <CommandItem
                    key={ga4.propertyId}
                    value={searchValue}
                    className="cursor-pointer"
                    onSelect={() => {
                      if (disabled) return;
                      onChange(ga4.propertyId);
                      setOpen(false);
                    }}
                  >
                    <div className="flex w-full items-center justify-between gap-2 py-1.5">
                      <TextWithPill
                        displayName={
                          ga4.displayName || ga4.propertyDisplayName || ""
                        }
                        propertyId={ga4.propertyId}
                        accountName={ga4.accountName}
                        accountId={ga4.accountId}
                      />
                      {isSelected ? (
                        <Check className="size-4 shrink-0" />
                      ) : null}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
